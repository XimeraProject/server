var mdb = require('../mdb'),
    remember = require('../remember'),
    async = require('async'),
    _ = require('underscore'),    
    path = require('path'),
    dirname = require('path').dirname,
    normalize = require('path').normalize,    
    extname = require('path').extname,
    pathJoin = require('path').join,
    winston = require('winston');

function renderError( res, err ) {
    res.status(500).render('fail', { title: "Internal Error", message: err });
}

exports.getLabel = function(req, res) {
    var commit = req.params.commit;
    var labelName = req.params.label;

    mdb.Label.findOne({label: labelName, commit: commit}).exec( function( err, label ) {
	if (!label) {
	    res.status(500).send(err);
	} else {
	    mdb.Activity.findOne({hash: label.activityHash, commit: commit}).exec( function( err, activity ) {
		if (!activity) {
		    res.status(500).send(err);
		} else  {
		    res.json( activity );
		}
	    });
	}
    });
};


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

exports.xourseFromUserAndRepo = function(req, res, next) {
    
    var branch = req.params.branch;
    if (!branch)
	branch = 'master';
    
    mdb.Branch.find( { owner: req.params.username, repository: req.params.repository, name: branch } )
	.sort({lastUpdate: -1})
	.limit(1).exec( function (err, branches) {
	    if (err) { next('route'); return; }
	    if (!branches) { next('route'); return; }
	    if (branches.length == 0) { next('route'); return; }
	    
	    var branch = branches[0];

	    if (!branch) { next('route'); return; }
	    
	    mdb.Xourse.findOne({commit: branch.commit}).exec( function(err, xourse) {
		if (err)
		    next('route');
		else {
		    if (!xourse)
			next('route');
		    else {
			req.xourse = xourse;
			req.locator = [req.params.username, req.params.repository, branch.name].join('/');			
			next();
		    }
		}
	    });
	});
};

exports.xourseFromCommit = function(req, res, next) {
    var sha = req.params.commit;

    mdb.Xourse.findOne({commit: sha}).exec( function(err, xourse) {
	if (err)
	    next('route');
	else {
	    if (!xourse)
		next('route');
	    else {
		req.xourse = xourse;
		req.locator = sha;
		next();
	    }
	}
    });
};


exports.objectFromCommit = function(req, res, next) {
    var model = mdb.GitFile;
    if (path.extname(req.params.path) == '')
	model = mdb.Activity;

    var sha = req.params.commit;

    mdb.Commit.findOne( { sha: sha } ).exec( function(err, commit) {
	if (err)
	    next('route');
	else {
	    model.find({path: req.params.path, commit: req.params.commit }).exec( function(err, objects) {
		if (objects.length == 0)
		    next('route');
		else {
		    req.commits = [sha];
		    req.commit = commit;
		    // BADBAD: the locator should be
		    // made symbolic because the
		    // locator is used to link to
		    // other pages ,which might cause
		    // some trouble with state
		    req.locator = sha;
		    req.objects = objects;
		    next();
		}
	    });
	}
    });
};

exports.objectFromUserAndRepo = function(req, res, next) {
    var model = mdb.GitFile;
    if (path.extname(req.params.path) == '')
	model = mdb.Activity;
    
    var branch = req.params.branch;
    if (!branch)
	branch = 'master';
    
    mdb.Branch.find( { owner: req.params.username, repository: req.params.repository, name: branch } )
	.sort({lastUpdate: -1})
	.exec( function( err, branches ) {
	    if (err)
		next('route');
	    else {
		if (branches.length == 0)
		    next('route');
		else {
		    // These will be in order from the most recent update
		    var commits = branches.map( function(branch) { return branch.commit; } );

		    model.find({path: req.params.path, commit: { $in: commits }}).exec( function(err, objects) {
			if (objects.length == 0)
			    next('route');
			else {
			    req.commits = commits;
			    req.branches = branches;
			    req.locator = [req.params.username, req.params.repository, branch].join('/');						    
			    req.objects = objects;
			    req.objects.sort( function(a,b) {
				return req.commits.indexOf( a.commit ) - req.commits.indexOf( b.commit );
			    });
			    
			    req.objects.forEach( function(object) {
				object.ownerName = req.params.username;
				object.repositoryName = req.params.repository;
				object.branchName = branch;
			    });
			    
			    next();
			}
		    });		    
		}
	    }
	});
};    


exports.activity = function(req, res) {
    remember(req);
    
    var user = req.user;
    var activities = undefined;
    var activityHashes = undefined;
    
    async.waterfall(
	[
	    function(callback) {
		activities = req.objects;
		activities.forEach( function(activity) { activity.locator = req.locator; } );
		
		// There may be duplicates here because the same
		// activity can appear in multiple commits
		activityHashes = activities.map( function(activity) { return activity.hash; } );
		
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

exports.source = function(req, res) {
    remember(req);
    
    var file = req.objects[0];
    
    mdb.Blob.findOne({hash: file.hash}).exec(function(err,blob) {
	if (err) {
	    renderError( res, err );
	} else {
	    file.data = blob.data;
	    res.render('source', { file: file });
	}
    });
};

exports.file = function( mimetype ) {
    return function(req, res) {
	remember(req);
	
	var file = req.objects[0];
    
	mdb.Blob.findOne({hash: file.hash}).exec(function(err,blob) {
	    if (err) {
		renderError( res, err );
	    } else {
		file.data = blob.data;
		res.contentType( mimetype );
		res.end( file.data, 'binary' );		
	    }
	});
    };
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
	},

	// Attach a preceeding chapter (if there is one!)
	function( callback ) {
	    var xourseActivity = activity.xourse.activities[activity.path];
	    if (xourseActivity) {
		var cssClass = xourseActivity.cssClass;
		
		// If we aren't currently in a chapter..
		if ( ! (cssClass && (cssClass.match(/chapter/)))) {
		    // Find the current activity
		    var i = activity.xourse.activityList.indexOf( activity.path );
		    // Walk backwards...
		    var j;
		    for( j = i; j >= 0; j-- ) {
			// Until we find a 'chapter' activity
			if (activity.xourse.activities[activity.xourse.activityList[j]].cssClass) {
			    if (activity.xourse.activities[activity.xourse.activityList[j]].cssClass.match(/chapter/))  {
				activity.chapter = activity.xourse.activities[activity.xourse.activityList[j]];
				break;
			    }
			}
		    }
		}
	    }
	    
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
		res.status(500).send(err);
	    } else {
		// Send answers statistics to instructor
		model.findOne({_id : hash}).exec( function( err, answers ) {
		    if (err)
			res.status(500).send(err);
		    else {
			if (answers)
			    res.json( answers.value );
			else
			    res.json( {} );
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

exports.progress = function(req, res) {
    var username = req.params.username;
    var reponame = req.params.repository;
    var course = username + "/" + reponame;
    
    if ( (!(req.user)) || !(req.user.instructor) ) {
	res.sendStatus(403);
	return;
    }
    
    mdb.Gradebook.findOne({_id: course}).exec( function(err,gradebook) {
	if (err)
	    res.status(500).send(err);
	else {
	    var header = [];
	    var rows = {};

	    // Verify that the user is an instructor for a commit that
	    // appeared in the course
	    console.log( gradebook.commits );
	    if (_.intersection( req.user.instructor, gradebook.commits ).length == 0) {
		console.log(" noope.");
		res.sendStatus(403);
	    } else {
		gradebook.users.forEach( function(user) {
		    var name = user.user;
		    rows[name] = [];
		    user.paths.forEach( function(path) {
			var complete = path.complete;		    
			var path = path.path;
			
			if (header.indexOf(path) < 0)
			    header.push(path);
			rows[name][header.indexOf(path)] = complete;
		    });
		});
		
		var csv = "name,";
		
		header.forEach( function(h) {
		    csv = csv + h + ",";
		});
		
		csv = csv + "\n";
		
		gradebook.users.forEach( function(user) {
		    var name = user.user;
		    csv = csv + name + ",";
		    rows[name].forEach( function(r) {
			csv = csv + r + ",";		    
		    });
		    csv = csv + "\n";
		});
		
		res.setHeader('Content-disposition', 'attachment; filename=' + reponame + '.csv');
		res.set('Content-Type', 'text/csv');
		res.status(200).send(csv);
	    }
	}
    });
};

exports.tableOfContents = function(req, res) {
    remember(req);
    
    var xourse = req.xourse;
    
    hash = xourse.hash;
    
    mdb.Blob.findOne({hash: hash}).exec(function(err, blob) {
	if ((err) || (!blob)) {
	    renderError( res, err );
	} else {
	    xourse.html = blob.data;
	    xourse.locator = req.locator;

	    xourse.activityList.forEach( function(activityPath) {
		var url = pathJoin( xourse.locator,
				    dirname( xourse.path ),
				    activityPath
				  );

		if (xourse.activities === undefined)
		    xourse.activities = {};
			
		if (xourse.activities[activityPath] === undefined) {
		    xourse.activities[activityPath] = {};
		    xourse.activities[activityPath].title = url;
		}

		var splashImage = xourse.activities[activityPath].splashImage;
		
		if (splashImage)
		    xourse.activities[activityPath].splashImage = '/activity/' + xourse.locator + '/' + splashImage;
		
		xourse.activities[activityPath].url = '/course/' + normalize(url);
	    });

	    console.log( "locator = ", xourse.locator );
	    
	    res.render('xourse', { xourse: xourse });
	}
    });
};


