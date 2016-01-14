var mdb = require('../mdb'),
    remember = require('../remember'),
    async = require('async'),
    dirname = require('path').dirname,
    normalize = require('path').normalize,    
    extname = require('path').extname,
    pathJoin = require('path').join,
    winston = require('winston');

exports.index = function(req, res) {
    remember(req);
    mdb.Course.find({}, function (err, courses) {
	res.render('course/index', { courses: courses });
    });
}

function renderError( res, err ) {
    res.status(500).render('fail', { title: "Internal Error", message: err });
}

function findMostRecentActivityWithState(user, owner, repository, branchName, path, callback) {
    var branches = [];
    var commits = [];
    var activities = [];
    var activityHashes = [];
    
    async.waterfall([
    	function (callback) {
	    // BADBAD: could include a "limit" here to only look back to the past 1000 commits...?
	    // Then student data would only disppear if it were /really/ old
	    mdb.Branch.find({owner: owner, repository: repository, name: branchName})
		.sort({lastUpdate: -1})
		.exec( callback );
	},
	
    	function (theBranches, callback) {
	    branches = theBranches;

	    if (branches.length == 0)
		callback( "Missing branch" );
	    else {
		// These will be in order from the most recent update
		commits = branches.map( function(branch) { return branch.commit; } );
	    
		// Path presumably has high selectivity, so we use that
		mdb.Activity.find({path: path, commit: { $in: commits }}).exec( callback );
	    }
	},

    	function (theActivities, callback) {
	    if (theActivities.length == 0) {
		callback( "Activity not found." );
		return;
	    }
	    
	    activities = theActivities;
	    
	    // Consider only activities which are connected to the
	    // requested branch
	    
	    // But this is not needed since we filtered in mongo,
	    // albeit without the benefit of an index since we're
	    // using $in

	    /*
	    activities = activities.filter( function(activity) {
		return commits.indexOf( activity.commit ) >= 0;
	    });    
	    */

	    // Mirror the commit order in the activities
	    activities.sort( function(a,b) {
		return commits.indexOf( a.commit ) - commits.indexOf( b.commit );
	    });

	    // There may be duplicates here because the same activity
	    // can appear in multiple commits
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
		
		// then the activity is the one associated with the most recent state
		activity = activities.filter( function(a) {
		    return a.hash == latestState.activityHash;
		} )[0];
	    }
	    
	    activity.branch = branches.filter( function(b) {
		return b.commit == activity.commit;
	    } )[0];

	    // If there's a more recent activity, let the user choose to update
	    if (activities[0].hash != activity.hash)
		activity.commitUpdated = activities[0].commit;
	    
	    callback( null, activity );
	}
    ], callback );
}


function findMostRecentBranch(owner, repository, branchName, callback) {
    mdb.Branch.find({owner: owner, repository: repository, name: branchName}).sort({lastUpdate: -1}).limit(1).exec( function (err, branches) {
	var branch = branches[0];
	callback( err, branch );
    });
}

function findMostRecentGitFileContents(owner, repository, branchName, commit, path, callback) {
    var branches = [];
    var commits = [];
    var files = [];
    var hash;
    
    async.waterfall(
	[
    	    function (callback) {
		var query = {owner: owner, repository: repository, name: branchName};
		if (commit)
		    query = { commit: commit };
		
		mdb.Branch.find(query)
		    .sort({lastUpdate: -1})
		    .exec( callback );
	    },
	    
    	    function (theBranches, callback) {
		branches = theBranches;
	    
		if (branches.length == 0)
		    callback( "Missing branch" );
		else {
		    // These will be in order from the most recent update
		    commits = branches.map( function(branch) { return branch.commit; } );
		    
		    // Path presumably has high selectivity, so we use that
		    mdb.GitFile.find({path: path, commit: { $in: commits }}).exec( callback );
		}
	    },

    	    function (theFiles, callback) {
		if (theFiles.length == 0) {
		    callback( "File not found." );
		    return;
		}
		
		files = theFiles;
	    
		// Mirror the commit order in the files
		files = files.sort( function(a,b) {
		    return commits.indexOf( a.commit ) - commits.indexOf( b.commit );
		});

		callback( null, files[0] );
	    },

	    function( gitFile, callback ) {
		if (!gitFile)
		    callback( "Missing gitFile", null );
		else {
		    hash = gitFile.hash;

		    mdb.Blob.findOne({hash: gitFile.hash}).exec(callback);
		}
	    },
		
	], function(err, result) {
	    if ((!err) && result) {
		result.commit = commit;
		result.path = path;
		result.owner = owner;
		result.hash = hash;
		result.branchName = branchName;		
		result.repository = repository;
	    }
	    
	    callback(err, result);
	});
}

function regexpForParentDirectories( path, extension ) {
    var parts = path.split('/');
    var re = (parts.join('(\/')) + ((new Array(parts.length)).join(')?'));
    re = '^(' + re + '\/)?\/?[^/]*\.' + extension + '$';
    return new RegExp(re);
}

/** Search owner/repository/branchName for all files matching
 * extension in the directory path and all any parent directories */
function findParentDirectoryFileContents( commit, path, extension, callback) {
    async.waterfall(
	[
	    function( callback ) {
		mdb.Branch.findOne({commit: commit}).exec( callback );
	    },
	    
	    function( branch, callback ) {
		if (!branch)
		    callback( "Missing branch", null );
		else {
		    var re = regexpForParentDirectories( path, extension );
		    mdb.GitFile.find({commit: branch.commit, path: {$regex: re}}).exec(callback);
		}
	    },
	    
	    function( gitFiles, callback ) {
		if (!gitFiles)
		    callback( "Missing gitFile", null );
		else {
		    mdb.Blob.find({hash: { $in: gitFiles.map( function(x) { return x.hash; } ) }}).exec(callback);
		}
	    },
	    
	], function(err, result) {
	    if ((!err) && result) {
		result.commit = commit;
		result.path = path;
	    }
	    
	    callback(err, result);
	});
}

exports.source = function(req, res) {
    remember(req);

    var owner = req.params.username;
    var repository = req.params.repository;
    var branchName = req.params.branch;
    var path = req.params.path;
    var commit = req.params.commit;
    
    findMostRecentGitFileContents( owner, repository, branchName, commit, path, function(err, file) {
	if (err)
	    renderError( res, err );
	else {
	    mdb.CompileLog.findOne({hash: file.hash, commit: file.commit}, function(err, compileLog) {
		res.render('source', { file: file, compileLog: compileLog });
	    });
	}
    });
};

exports.stylesheet = function(req, res) {
    var commit = req.params.commit;
    var path = req.params.path.replace( /\.css$/, '' );

    findParentDirectoryFileContents( commit, path, "css", function(err, files) {
	res.contentType( 'text/css' );

	if (err) {
	    res.send( "/* No CSS file */\n" );
	} else {
	    var output = Buffer.concat( files.map( function(f) { return f.data; } ) );
	    res.end( output, 'binary' );
	}
    });
};

exports.javascript = function(req, res) {
    var owner = req.params.username;
    var repository = req.params.repository;
    var branchName = req.params.branch;
    var path = req.params.path;
    var commit = req.params.commit;
    
    findMostRecentGitFileContents( owner, repository, branchName, commit, path, function(err, file) {    
	if (err)
	    renderError( res, err );
	else {
	    res.contentType( 'text/javascript' );
	    res.end( file.data, 'binary' );
	}
    });
};


exports.image = function(req, res) {

    var owner = req.params.username;
    var repository = req.params.repository;
    var branchName = req.params.branch;
    var path = req.params.path;
    var commit = req.params.commit;
    
    findMostRecentGitFileContents( owner, repository, branchName, commit, path, function(err, file) {
	if (err)
	    renderError( res, err );
	else {
	    // SVG files will only be rendered if they are sent with content type image/svg+xml
	    if (extname(path) == ".svg")
		res.contentType( 'image/svg+xml' );
	    else if (extname(path) == ".jpg")
		res.contentType( 'image/jpeg' );
	    else
		res.contentType( 'image/' + extname(path).replace('.', '') );

	    res.end( file.data, 'binary' );
	}
    });
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
	
	// Get the xourse
	function( commit, callback ) {
	    if (!commit)
		callback( "Missing branch", null );
	    else {
		mdb.Xourse.findOne({commit: commit}).exec(callback);
	    }
	},
	
	// Attach the xourse to the activity
	function( xourse, callback ) {
	    if (xourse) {
		xourse.activityList.forEach( function(activityPath) {
		    var url = pathJoin( activity.ownerName,
					activity.repositoryName,
					activity.branchName,
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
	    
	    res.render('activity', { activity: activity, stylesheet: stylesheet,
				     nextActivity: nextActivity, previousActivity: previousActivity,
				     javascript: javascript });
	}
    });
};

exports.activityByHashHead = function(req, res) {
    var commit = req.params.commit;
    var path = req.params.path;

    mdb.Activity.findOne({path: path, commit: commit}).exec( function( err, activity ) {
	if (!activity)
	    res.send(404);
	else
	    res.send(200);
    });
};

exports.activityByHash = function(req, res) {
    remember(req);
    
    var commit = req.params.commit;
    var path = req.params.path;

    mdb.Activity.findOne({path: path, commit: commit}).exec( function( err, activity ) {
	if (!activity) {
	    renderError( res, "Missing activity" );
	    return;
	}
	
	if (err)
	    renderError( res, err );
	else {
	    mdb.Branch.findOne({commit: commit}).exec( function( err, branch ) {
		if (!branch) {
		    renderError( res, "Missing activity" );
		    return;
		}
		
		if (err)
		    renderError( res, err );
		else {
		    activity.repositoryName = branch.repository;
		    activity.ownerName = branch.owner;
		    activity.branchName = branch.name;

		    renderActivity( res, activity );
		}
	    });
	}
    });
}

exports.activity = function(req, res) {
    remember(req);

    var owner = req.params.username;
    var repository = req.params.repository;
    var branchName = req.params.branch;
    var path = req.params.path;

    findMostRecentActivityWithState(req.user, owner, repository, branchName, path, function( err, activity ) {
	if (err) {
	    if ((err == "Missing branch") && (branchName != "master"))
		res.redirect("/course/" + owner + "/" + repository + "/master/" + branchName + "/" + path);
	    else
		renderError( res, err );
	} else {
	    activity.repositoryName = repository;
	    activity.ownerName = owner;
	    activity.branchName = branchName;
	    
	    renderActivity( res, activity );
	}
    });
}


exports.tableOfContents = function(req, res) {
    remember(req);
    
    var owner = req.params.username;
    var repository = req.params.repository;
    var branchName = req.params.branch;

    if (branchName === undefined)
	branchName = 'master';

    var commit;
    var hash;
    var xourse;    
    
    async.waterfall(
	[
	    function( callback ) {
		findMostRecentBranch( owner, repository, branchName, callback );
	    },
	    
	    function( branch, callback ) {
		if (!branch)
		    callback( "Missing branch", null );
		else {
		    commit = branch.commit;
		    mdb.Xourse.findOne({commit: branch.commit}).exec(callback);
		}
	    },
	    
	    function( aXourse, callback ) {
		if (!aXourse)
		    callback( "Missing Xourse", null );
		else {
		    xourse = aXourse;

		    hash = xourse.hash;
		    mdb.Blob.findOne({hash: hash}).exec(callback);
		}
	    },
	    
	], function(err, result) {
	    if ((err == "Missing branch") && (branchName != "master")) {
		// BADBAD: sometimes ACTIVITY is undefined
		res.redirect("/course/" + activity.ownerName + "/" + activity.repositoryName + "/master/" + activity.branchName + "/");
	    } else {
		if ((err) || (!result)) {
		    renderError( res, err );
		} else {
		    result.commit = commit;
		    result.owner = owner;
		    result.hash = hash;
		    result.repository = repository;
		    
		    xourse.html = result.data;
		    xourse.repositoryName = result.repository;
		    xourse.ownerName = result.owner;
		    xourse.branchName = branchName;

		    xourse.activityList.forEach( function(activityPath) {
			var url = pathJoin( xourse.ownerName,
					    xourse.repositoryName,
					    xourse.branchName,
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
			    xourse.activities[activityPath].splashImage = '/activity/' + commit + '/' + splashImage;
			
			xourse.activities[activityPath].url = '/course/' + normalize(url);
		    });

		    res.render('xourse', { xourse: xourse });
		}
	    }
	});
};


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
			
			activity.commit = commit;
		    });
		
		    res.json( xourse.activities );
		} else
		    res.json( {} );
	    }
	}
    });    
};
