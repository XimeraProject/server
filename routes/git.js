var async = require('async');
var mongo = require('mongodb');
var mdb = require('../mdb');
var winston = require("winston");
var mongoose = require('mongoose');
var path = require('path');
var url = require('url');
var fs = require('fs');
var url = require('url');
var _ = require('underscore');
var repositories = require('./repositories');
var metadata = require('./metadata');
var ETag = require('./etag');

var config = require('../config');

function authorization(req,res,next) {
    var authorization = undefined;
    var token = undefined;
    
    if (req.headers.authorization) {
	authorization = req.headers.authorization;
    } else if (req.get('Authorization')) {
	authorization = req.get('Authorization');	
    }

    if (authorization === undefined) {
	res.statusCode = 401;
	var realm = "Authorization required";
	res.setHeader('WWW-Authenticate', 'Basic realm="' + realm + '"');
	res.end('Unauthorized');	
    } else {
	var token = "";
	var parts = authorization.split(' ');
	
	if (parts[0].match(/Bearer/)) {
	    token = parts.reverse()[0];
	}
	
	if (parts[0].match(/Basic/)) {
	    token = new Buffer(parts[1], 'base64').toString();
	    token = token.split(":").reverse()[0];
	}
	
	var repositoryName = req.params.repository;

	repositories.readRepositoryToken( repositoryName )
	    .then(function(buf) {
		if (buf == token) {
		    next();
		} else
		    next(new Error('Bearer token is invalid.'));
	    }).catch(function(e) {
		next(new Error(e));
	    });
    }
}

exports.authorization = authorization;

exports.create = function(req, res) {
    var repositoryName = req.params.repository;

    repositories.create( repositoryName, req.keyid )
	.then(function(token) {
	    res.json( {token:token,keyid:req.keyid} );
	})
	.catch(function(err) {
	    res.status(400).send(err);	    
	});
    
    return;
};

exports.activitiesFromRecentCommitsOnMaster = function(req, res, next) {
    var repositoryName = req.params.repository;
    req.repositoryName = req.params.repository;
    
    repositories.activitiesFromRecentCommitsOnMaster( repositoryName, req.params.path )
	.then( function(activities) {
	    req.activities = activities;
	    next();
	})
	.catch( function(err) {
	    next(err);
	});
};


exports.parseActivity = function(req,res,next) {
    if (req.activity.hash) {
	metadata.parseActivityBlob( req.repositoryName, req.activity.hash, function(err, activity) {
	    req.activity = _.extend( req.activity, activity );
	    next();
	});
    } else {
	res.status(500).send('missing entry');	
    }
};

exports.render = function(req, res, next) {
    var activity = req.activity;
	    
    if (activity.kind == 'xourse') {
	var xourse = activity;
	xourse.path = req.activity.path;
	if (xourse.path) {
	    xourse.path = xourse.path.replace(/\.html$/,'')
	}		
	res.render('xourses/view', { xourse: xourse,
			       repositoryName: req.repositoryName });
	return;
    }
    
    activity.freshestCommit = req.activity.freshestCommit;
    activity.commit = req.activity.sourceSha;
    activity.path = req.activity.path;
    if (activity.path) {
	activity.path = activity.path.replace(/\.html$/,'')
    }
    
    if (req.activity.xourse) {
	metadata.parseXourseBlob( req.repositoryName, req.activity.xourse.hash, function(err,xourse) {
	    xourse.path = req.activity.xourse.path;
	    xourse.hash = req.activity.xourse.hash;
	    
	    if (xourse.path) {
		xourse.path = xourse.path.replace(/\.html$/,'')
	    }
	    
	    activity.xourse = xourse;
	    
	    var nextActivity = null;
	    var previousActivity = null;
	    if (activity && (activity.xourse) && (activity.xourse.activityList)) {
		var list = activity.xourse.activityList.filter( function(s) { return !(s.match(/^#/)); } );
		var i = list.indexOf( activity.path );
		if (i >= 0)
		    nextActivity = list[i+1];
		if (i > 0)
		    previousActivity = list[i-1];
	    }
	    
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
	    
	    res.render('page', { activity: activity,
				 repositoryName: req.repositoryName,
				 repositoryMetadata: req.repositoryMetadata,
				 nextActivity: nextActivity,
				 previousActivity: previousActivity,
				 url: req.url });		    
	});
    } else {
	activity.xourse = {};
	activity.xourse.activityList = [];
	res.render('page', { activity: activity,
			     repositoryMetadata: req.repositoryMetadata,
			     repositoryName: req.repositoryName,
			     url: req.url
			   });
    }
};


// choose a specific commit based on the user's available states,
// unless there is a ?sha after the url, in which case we should just
// use that specic blob.  we also should mark if we need to update?
exports.chooseMostRecentBlob = function(req, res, next) {
    var activities = req.activities;
    var activityHashes = undefined;

    var shas = Object.keys(req.query);
    var sha = null;
    
    if (shas.length > 0) {
	sha = shas[0];
	activities = activities.filter( function(activity) { return activity.sourceSha == sha; });
    }
    
    async.waterfall(
	[
	    function(callback) {
		// There may be duplicates here because the same
		// activity can appear in multiple commits
		activityHashes = activities.map( function(activity) { return activity.activityHash; } );

		activityHashes = activityHashes.filter(function(item, pos) {
		    return activityHashes.indexOf(item) == pos;
		});
		
		mdb.State.find({user: req.user._id, activityHash: { $in: activityHashes }}).exec( callback );
	    },
	    function( states, callback ) {
		var activity = activities[0];
		
		if (activity === undefined) {
		    callback("no activity found.");
		    return;
		}
		
		// If there are some states...
		if (states.length > 0) {
		    states = states.sort( function(a,b) {
			return activityHashes.indexOf( a.activityHash ) - activityHashes.indexOf( b.activityHash );
		    });

		    var latestState = states[0];
		    // then the activity is the one associated with
		    // the most recent state
		    activity = activities.filter( function(a) {
			return a.activityHash == latestState.activityHash;
		    } )[0];
		}

		// If there's a more recent activity, let the user choose to update
		if (activities[0].activityHash != activity.activityHash) {
		    activity.freshestCommit = activities[0].sourceSha;
		}
		
		callback( null, activity );
	    },
	], function(err, activity) {
	    if (err) {
		res.status(500).send(err);
	    } else {
		req.activity = activity;
		next();
	    }
	});
};


exports.serve = function( mimetype ){
    return function(req, res, next) {    
	var file = req.activities[0];
	var etag = 'sha:' + file.hash;

	ETag.checkIfNoneMatch( req, res, etag,
			       function( setETag ) {
				   repositories.readBlob( req.repositoryName, file.hash )
				       .then( function(blob) {
					   file.data = blob;
					   res.contentType( mimetype );
					   setETag( res );
					   res.end( blob, 'binary' );		
				       })
				       .catch( function(err) {
					   next(new Error(err));
				       });
			       });
    };
};

exports.source = function(req, res, next) {
    var file = req.activities[0];
    repositories.readBlob( req.repositoryName, file.hash )
	.then( function(blob) {
	    file.data = blob;
	    res.render('source', { file: file });
	})
	.catch( function(err) {
	    next(new Error(err));
	});
};

exports.ltiConfig = function(req, res) {
    var file = req.activities[0];
        
    var hash = {
	title: 'Ximera ' + file.path.replace(/\.html$/,''),
	description: '',
	launchUrl: config.root + '/lms',
	xourse: { repositoryName: req.repositoryName,
		  path: file.path.replace(/\.html$/,'')
		},
	domain: url.parse(config.root).hostname
    };
        
    res.render('lti/config', hash);
};


exports.fetchMetadataFromActivity = function(req, res, next) {
    if (req.activity.metadataHash) {
	repositories.readBlob( req.repositoryName, req.activity.metadataHash )
	    .then( function(blob) {
		req.repositoryMetadata = JSON.parse(blob);
		next();
	    })
	    .catch( function(err) {
		next(new Error(err));
	    });
    } else {
	next();
    }
};

exports.mostRecentMetadata = function(req, res, next) {
    var repositoryName = req.params.repository;
    req.repositoryName = req.params.repository;
    
    repositories.mostRecentMetadataOnBranch( repositoryName, "master" )
	.then( function(metadata) {
	    req.repositoryMetadata = JSON.parse(metadata);
	    next();	    
	})
	.catch( function(err) {
	    next(err);
	});
};
