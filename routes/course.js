var mdb = require('../mdb'),
    remember = require('../remember'),
    async = require('async'),
    path = require('path'),
    dirname = require('path').dirname,
    normalize = require('path').normalize,    
    extname = require('path').extname,
    pathJoin = require('path').join,
    winston = require('winston');

// Async-kit's race has slightly different semantics than async's race; in this case, the first non-error is returned.
var race = require('async-kit').race;

function renderError( res, err ) {
    res.status(500).render('fail', { title: "Internal Error", message: err });
}

exports.activityByHashHead = function(req, res) {
    var commit = req.params.commit;
    var path = req.params.path;

    mdb.Activity.findOne({path: path, commit: commit}).exec( function( err, activity ) {
	if (!activity)
	    res.sendStatus(404);
	else
	    res.sendStatus(200);
    });
};

var findBranch = function( username, reponame, branch, filename, model, callback ) {
    mdb.Branch.find( { owner: username, repository: reponame, name: branch } )
	.sort({lastUpdate: -1})
	.exec( function( err, branches ) {
	    if (err)
		callback(err);
	    else {
		if (branches.length == 0)
		    callback( "Missing branch" );
		else {
		    // These will be in order from the most recent update
		    var commits = branches.map( function(branch) { return branch.commit; } );

		    model.find({path: filename, commit: { $in: commits }}).exec( function(err, objects) {
				if (objects.length == 0)
				    callback( "Nothing found." );
				else
				    callback( err, { commits: commits,
						     branches: branches,
						     locator: [username, reponame, branch].join('/'),
						     filename: filename,
						     objects: objects } );				
		    });		    
		}
	    }
	});
};

/** findObjectsFromPathWithLocator takes a path for an object (of type model) which could be of the form
       commit/the/file/path.txt or
       username/reponame/branch/the/file/path.txt or    
       username/reponame/the/file/path.txt (meaning the "master" branch implicitly)
 and calls callback with the located objects
 */
var findObjectsFromPathWithLocator = function(pathname, model, callback) {
    // Use async-kit's race so that the first NON-error is called
    race(
	[
	    // Find commit by commit hash
	    function(callback) {
		var separated = pathname.split('/');
		var sha = separated.shift();
		var filename = separated.join('/');

		if (!(sha.match(/^[0-9A-Fa-f]*$/))) {
		    callback('not a hexadecimal hash');
		} else {
		    mdb.Commit.findOne( { sha: sha } ).exec( function(err, commit) {
			if (err)
			    callback( err );
			else {
			    model.find({path: filename, commit: sha}).exec( function(err, objects) {
				if (objects.length == 0)
				    callback( "Nothing found." );
				else
				    // BADBAD: the locator should be
				    // made symbolic because the
				    // locator is used to link to
				    // other pages ,which might cause
				    // some trouble with state
				    callback( err, { commits: [sha],
						     commit: commit,
						     locator: sha,
						     filename: filename,
						     objects: objects } );				
			    });
			}
		    });
		}
	    },

	    // Find commit by username/reponame
	    function(callback) {
		var separated = pathname.split('/');
		var username = separated.shift();
		var reponame = separated.shift();
		var branchname = 'master';
		var filename = separated.join('/');

		if ((username) && (reponame))
		    findBranch( username, reponame, branchname, filename, model, callback );
		else
		    callback( "Missing username and reponame" );
	    },

	    // Find commit by username/reponame/branchname
	    function(callback) {
		var separated = pathname.split('/');
		var username = separated.shift();
		var reponame = separated.shift();
		var branchname = separated.shift();		
		var filename = separated.join('/');

		if ((username) && (reponame) && (branchname))
		    findBranch( username, reponame, branchname, filename, model, callback );
		else
		    callback( "Missing username and reponame and branchname" );
	    }
	]).exec( function( err, result ) {
	    if (err) {
		callback(err);
	    } else {
		result.objects.sort( function(a,b) {
		    return result.commits.indexOf( a.commit ) - result.commits.indexOf( b.commit );
		});
		callback( null, result );
	    }
	});
};


exports.activity = function(req, res) {

    var user = req.user;
    var activities = undefined;
   
    async.waterfall(
	[
	    function(callback) {
		findObjectsFromPathWithLocator( req.params.path, mdb.Activity, callback);
	    },
	    function(result, callback) {
		activities = result.objects;
		activities.forEach( function(activity) { activity.locator = result.locator; } );
		
		// There may be duplicates here because the same
		// activity can appear in multiple commits
		var activityHashes = activities.map( function(activity) { return activity.hash; } );
		
		mdb.State.find({user: user._id, activityHash: { $in: activityHashes }}).exec( callback );
	    },
	    function( states, callback ) {
		var activity = activities[0];
		
		// If there are some states...
		if (states.length > 0) {
		    states = states.sort( function(a,b) {
			return activityHashes.indexOf( a.activityHash ) - activityHashes.indexOf( b.activityHash );
		    });
		    
		    var latestState = states[0];
		    
		    // then the activity is the one associated with
		    // the most recent state
		    activity = activities.filter( function(a) {
			return a.hash == latestState.activityHash;
		    } )[0];
		}

		/* BADBAD: is this needed now that I have activity.locator?
		activity.branch = branches.filter( function(b) {
		    return b.commit == activity.commit;
		} )[0];
		 */
		
		// If there's a more recent activity, let the user choose to update
		if (activities[0].hash != activity.hash)
		    activity.commitUpdated = activities[0].commit;
		
		callback( null, activity );
	    },
	],
	function( err, activity ) {
	    if (err) {
		renderError( res, err );
	    } else {
		renderActivity( res, activity );
	    }
	});
};

exports.file = function(req, res) {
    var file = undefined;
    
    async.waterfall(
	[
	    function(callback) {
		findObjectsFromPathWithLocator( req.params.path, mdb.GitFile, callback);
	    },
	    function(result, callback) {
		file = result.objects[0];
		mdb.Blob.findOne({hash: file.hash}).exec(callback);
	    },
	],
	function( err, blob ) {
	    if (err) {
		renderError( res, err );
	    } else {
		file.data = blob.data;
		    
		if (path.extname(file.path) == ".tex") {
		    res.render('source', { file: file });
		} else {
		    if (path.extname(file.path) == ".js") {
			res.contentType( 'text/javascript' );
		    } else if (path.extname(file.path) == ".css") {
			res.contentType( 'text/css' );		    
		    } else if (path.extname(file.path) == ".svg") {
			// SVG files will only be rendered if they are sent with content type image/svg+xml			
			res.contentType( 'image/svg+xml' );
		    } else if (path.extname(file.path) == ".jpg") {
			res.contentType( 'image/jpeg' );
		    } else if (path.extname(file.path) == ".png") {
			res.contentType( 'image/' + path.extname(file.path).replace('.', '') );
		    } else if (path.extname(file.path) == ".pdf") {
			res.contentType( 'image/' + path.extname(file.path).replace('.', '') );
		    } 		    
		    
		    res.end( file.data, 'binary' );
		}
	    }
	}
    );
};

exports.activityOrFile = function(req, res) {
    remember(req);

    var noun = req.params.noun; // either 'course' or 'activity'

    if (path.extname(req.params.path) == '') {
	exports.activity( req, res );
    } else {
	exports.file( req, res );	
    }
};  
    
    
function renderActivity( res, activity ) {
    var commit;
    var hash;
    var activity;
    
    async.waterfall([
	// Get the HTML content
	function( callback ) {
	    if (!activity)
		callback( "Missing activity", null );
	    else {
		commit = activity.commit;
		hash = activity.hash;
		mdb.Blob.findOne({hash: hash}).exec(callback);
	    }
	},
	
	// Attach HTML and previous data to the activity
	function( result, callback ) {
	    if (result) {
		activity.html = result.data;	    
	    }
	    
	    callback( null, commit );
	},	    	    
	
	// Get the (or rather a) xourse
	function( commit, callback ) {
	    /*
	    if (!commit)
		callback( "Missing branch", null );
	    else {
		mdb.Xourse.findOne({commit: commit}).exec(callback);
	    }
	     */
	    mdb.Xourse.findOne({commit: commit}).exec(callback);	    
	},
	
	// Attach the xourse to the activity
	function( xourse, callback ) {
	    if (xourse) {
		xourse.activityList.forEach( function(activityPath) {
		    var url = pathJoin( activity.locator,
					dirname( xourse.path ),
					activityPath
				      );
		    
		    if (xourse.activities === undefined)
			xourse.activities = {};
		    
		    if (xourse.activities[activityPath] === undefined) {
			xourse.activities[activityPath] = {};
			xourse.activities[activityPath].title = url;
		    }
		    
		    xourse.activities[activityPath].url = '/course/' + normalize(url);
		});
		
		activity.xourse = xourse;		    
	    } else {
		xourse = {};
		xourse.activityList = [];
		xourse.activities = {};		
	    }

	    activity.xourse = xourse;		    	    
	    
	    callback(null);
	}
	
    ], function(err, result) {
	if (err) {
	    renderError( res, err );
	} else {
	    var nextActivity = null;
	    var previousActivity = null;
	    if (activity && (activity.xourse) && (activity.xourse.activityList)) {
		var i = activity.xourse.activityList.indexOf( activity.path );
		if (i >= 0)
		    nextActivity = activity.xourse.activityList[i+1];
		if (i > 0)
		    previousActivity = activity.xourse.activityList[i-1];			
	    }
    
	    var stylesheet = '/activity/' + activity.commit + '/' + activity.path + '.css';
	    var javascript = '/activity/' + activity.commit + '/' + activity.path + '.js';

	    res.render('activity', { activity: activity,
				     stylesheet: stylesheet,
				     nextActivity: nextActivity,
				     previousActivity: previousActivity,
				     javascript: javascript });
	}
    });
};

/* ************************************************************** */

function statistics( req, res, model )
{
    var commit = req.params.commit;
    var hash = req.params.hash;

    // Verify that the user is an instructor for that given commit
    if (('user' in req) && (req.user.instructor.indexOf(commit) > 0)) {
	// Verify that the hash belongs to the given commit
	mdb.Activity.findOne({hash: hash, commit: commit}).exec( function( err, activity ) {
	    if (err || (!activity)) {
		res.sendStatus(500);
	    } else {
		// Send answers statistics to instructor
		model.findOne({_id : hash}).exec( function( err, answers ) {
		    if ((err) || (!answers))
			res.status(500).send(err);
		    else {
			res.json( answers.value );
		    }
		});
	    }
	});
    } else {
	res.sendStatus(403);
    }    
}

exports.answers = function(req, res) { return statistics( req, res, mdb.Answers ); };

exports.successes = function(req, res) { return statistics( req, res, mdb.Successes ); };

/* The xourse navigation depends on this. */
exports.getActivitiesFromCommit = function(req, res) {
    var commit = req.params.hash;

    mdb.Xourse.findOne({commit: commit}, function(err, xourse) {
	if (err) {
	    res.json({});
	} else {
	    if (!(xourse)) {
		res.json({});
	    } else {
		if ('activities' in xourse) {

		    xourse.activityList.forEach( function(activityPath) {
			var activity = xourse.activities[activityPath];
			if (activity)
  			  activity.commit = commit;
		    });
		
		    res.json( xourse.activities );
		} else
		    res.json( {} );
	    }
	}
    });    
};
