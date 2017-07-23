var async = require('async');
var backend = require('git-http-backend');
var crypto = require('crypto');
var mongo = require('mongodb');
var mdb = require('../mdb');
var winston = require("winston");
var mongoose = require('mongoose');
var path = require('path');
var url = require('url');
var crypto = require('crypto');
var spawn = require('child_process').spawn;
var nodegit = require("nodegit");
var fse = require("fs-extra");
var fs = require('fs');
var url = require('url');
var cheerio = require('cheerio');

var config = require('../config');
var gitRepositoriesRoot = config.repositories.root;

exports.rootUrl = "";

function normalizeRepositoryName( name ) {
    return name.replace( /[^0-9A-Za-z-]/, '' ).toLowerCase();
}

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
	
	var repositoryName = normalizeRepositoryName(req.params.repository);
	req.params.repository = repositoryName;
	
	var repositoryPath = path.resolve(gitRepositoriesRoot, repositoryName + '.git');

	nodegit.Repository.openBare(repositoryPath).then(function(repository) {
	    repository.configSnapshot().then(function(config) {
		config.getStringBuf('ximera.token').then(function(buf) {
		    if (buf == token) {
			next();
		    } else
			next(new Error('Bearer token is invalid.'));
		}).catch(function(e) {
		    res.status(404).send('Repository ' + repositoryName + '.git is missing a Ximera token.');
		});
	    });
	}).catch(function(e) {
	    res.status(404).send('Repository ' + repositoryName + '.git not found.');
	});
    }
}

exports.authorization = authorization;

function sendToken( repository, req, res ) {
    repository.config().then(function(config) {
	// Use config
	crypto.randomBytes(48, function(err, buffer) {
	    var token = buffer.toString('base64');
	    config.setString ('ximera.keyid', req.keyid).
		then(function(result) {
		    config.setString ('ximera.token', token);
		    res.json( {token:token,keyid:req.keyid} );					
		});
	});
    }).catch(function(e) {
	res.status(409).send('Could not save token.');
    });
}

exports.create = function(req, res) {
    var repositoryName = normalizeRepositoryName(req.params.repository);
    var repositoryPath = path.resolve(gitRepositoriesRoot, repositoryName + '.git');

    nodegit.Repository.open(repositoryPath).then(function(repository) {
	// Repository already exists.
	repository.config().then(function(config) {
	    config.getStringBuf('ximera.keyid').then(function(keyid) {
		if (keyid == req.keyid)
		    sendToken( repository, req, res );
		else
		    res.status(403).send('You do not own the repository.');
	    }).catch(function(e) {
		res.status(404).send('Repository ' + repositoryName + '.git is missing a GPG key fingerprint.');
	    });;
	});
    }).catch(function(e) {
	fse.ensureDir(repositoryPath, function(err) {
	    if (err) {
		res.status(400).send(err);
	    } else {
		nodegit.Repository.init(repositoryPath, 1).then(function(repository) {
		    sendToken( repository, req, res );
		}).catch(function(e) {
		    res.status(409).send('Could not create repository.');
		});
	    }
	});
    });
    
    return;
};

exports.git = function(req, res) {
    var repo = req.params.repository;
    var dir = path.join(gitRepositoriesRoot, repo + '.git');

    req.pipe(backend(req.url, function(err, service) {
	if (err) {
	    console.log("err=",err);
	    res.statusCode = 500;
	    res.end(err + '\n');
	    return;
	}
	
	res.setHeader('content-type', service.type);

	// If the request is to modify our repository in some form...
	if (service.cmd !== 'git-upload-pack') {
	    // Then we require that a bearer token be presented
	    authorization( req, res, function() {
		var ps = spawn(service.cmd, service.args.concat(dir));
		ps.stdout.pipe(service.createStream()).pipe(ps.stdin);		
	    });
	} else {
	    var ps = spawn(service.cmd, service.args.concat(dir));
	    ps.stdout.pipe(service.createStream()).pipe(ps.stdin);
	}
    })).pipe(res);
};

exports.repository = function(req, res, next) {
    var repositoryName = normalizeRepositoryName(req.params.repository);    
    var repositoryPath = path.resolve(gitRepositoriesRoot, repositoryName + '.git');
    console.log( repositoryPath );
    fs.stat(repositoryPath, function (err, stats){
	if (err || !stats.isDirectory()) {
	    if (err)
		next(err);
	    else
		next(new Error('The repository is not a directory.'));
	} else {
	    nodegit.Repository.openBare(repositoryPath).then(function(repository) {
		req.repository = repository;
		req.repositoryName = repositoryName;
		
		console.log("Found repository", repository.path());
		next();
	    });
	}
    });    
};

// this gives the most recent, but what i _really want_ is the most recent on a given branch
exports.newestPublishedCommit = function(req, res, next) {
    var repository = req.repository;
    var revwalk = nodegit.Revwalk.create(repository);
    var result = revwalk.pushGlob("refs/tags/publications/*");

    revwalk.sorting(nodegit.Revwalk.SORT.TOPOLOGICAL | nodegit.Revwalk.SORT.TIME);
		    
    revwalk.next().then(function(oid) {
	console.log(oid);
	repository.getCommit(oid).then(function(commit) {
	    req.commit = commit;
	    next();
	});
    });
};

exports.publishedCommitOnBranch = function(branch, req, res, next) {
    var repository = req.repository;
    var revwalk = nodegit.Revwalk.create(repository);
    var result = revwalk.pushRef("refs/heads/" + branch);
    revwalk.sorting(nodegit.Revwalk.SORT.TOPOLOGICAL | nodegit.Revwalk.SORT.TIME);

    var commit = undefined;
    
    async.doDuring(
	function (callback) {
	    revwalk.next().then(function(oid) {
		repository.getCommit(oid).then(function(commit) {
		    callback(null, commit);
		});
	    }).catch(callback);
	},
	function (commit, callback) {
	    nodegit.Reference.lookup(repository, "refs/tags/publications/" + commit.sha()).then(function(reference) {
		var oid = reference.target();
		repository.getCommit(oid).then(function(commit) {
		    req.commit = commit;
		    callback(null, false);
		});
	    }).catch( function(err) {
		callback(null, true);		
	    });
	},
	function (err) {
	    next();
	}
    );
};

// This also needs to deal with whatever the most recent state is for the user
exports.publishedCommitOnMaster = function(req, res, next) {
    return exports.publishedCommitOnBranch("master", req, res, next);
};

exports.getEntry = function(req, res, next) {
    var commit = req.commit;

    if (!commit) {
	res.status(500).send('No commit found');
	return;
    }
    
    var parts = req.params.path.split('/');
    
    var possiblePaths = [];

    for (var i = 0; i <= parts.length; i++) {
	var partialPath = parts.slice(0,i).join('/');
	var remainder = parts.slice(i).join('/');
	
	possiblePaths.push( {path: partialPath + '.html', remainder: remainder} );
	possiblePaths.push( {path: partialPath + '.html', remainder: remainder + '.html'} );
    }

    console.log( possiblePaths );
    
    commit.getTree().then(function(tree) {
	var root = tree;
	
	async.detectSeries(possiblePaths, function(item, callback) {
	    tree.getEntry(item.remainder).then(function(treeEntry) {
		req.entry = treeEntry;

		tree.getEntry(item.path).then(function(treeEntry) {
		    req.xourse = treeEntry;
		    callback(null,true);
		}).catch(function(err) {
		    callback(null,true);
		});
	    }).catch( function(err) {
		callback(null,false);
	    });
	}, function(err) {
	    if (err) {
		next(err);
	    } else {
		next();
	    }
	});
    });
};

// this is what really should be cached -- and it can be safely cached
// forever because the blob is immutable
function parseActivityBlob( blob, callback ) {
    var activity = { kind: 'activity' };
    
    var source = blob.content();
    var $ = cheerio.load( source, {xmlMode: true} );

    var isXourse = $('meta[name="description"]').attr('content') == 'xourse';
    if (isXourse) {
	parseXourseDocument( $, callback );
	return;
    }
    
    $('a').each( function() {
	if ($(this).attr('id'))
	    $(this).remove();
    });
    
    activity.title = $('title').html();
    activity.html = $('body').html();
    activity.hash = blob.id().toString();
    activity.description = $('div.abstract').html();
    
    callback( null, activity );
}

function parseXourseDocument( $, callback ) {
    var xourse = { kind: 'xourse' };
    xourse.activityList = [];
    xourse.activities = {};

    $('.activity').each( function() {
	$(this).attr('data-weight','1');
    });

    $('.graded').each( function() {
	var graded = $(this);

	var total = 0;
	$(this).children( '[data-weight]' ).each( function() {
	    var child = $(this);
	    total = total + parseInt( child.attr('data-weight') );
	});

	graded.attr( 'data-weight-children', total );
    });
    
    $('.card').each( function() {
	var card = {};

	var element = $(this);

	var weight = 1.0;
	element.parents( '.graded' ).each( function() {
	    var parent = $(this);
	    if (parseFloat(parent.attr('data-weight-children')) != 0) {
		weight = weight * parseFloat(parent.attr('data-weight')) / parseFloat(parent.attr('data-weight-children'));
	    } else {
		weight = 0.0;
	    }
	});
	card.weight = weight;
	
	card.title = $('h2',this).html();
	if (card.title === null) {
	    card.title = element.html();
	}
	
	card.summary = $('h3',this).html();
	card.cssClass = element.attr('class').replace('activity','');
	    
	// BADBAD: these hashes need to be found, or we need to
	// replace how we store progress
	card.hashes = [];
	
	card.href = element.attr('href');
	if (card.href === undefined) {
	    card.href = '#' + element.attr('id');
	}

	xourse.activities[card.href] = card;
	xourse.activityList.push( card.href );
    });

    xourse.totalPoints = 0.0;
    $('[data-weight]:not([data-weight] [data-weight])').each( function() {
	xourse.totalPoints = xourse.totalPoints + parseFloat($(this).attr('data-weight'));
    });
    
    xourse.title = $('title').html();
    xourse.html = $('body').html();
    
    callback(null, xourse);
}


// these should also be cached
function parseXourseBlob( blob, callback ) {
    var source = blob.content();
    var $ = cheerio.load( source, {xmlMode: true} );
    
    parseXourseDocument( $, callback );
}

exports.render = function(req, res, next) {
    if (req.activity.entry) {
	parseActivityBlob( req.activity.blob, function(err, activity) {
	    
	    if (activity.kind == 'xourse') {
		var xourse = activity;
		xourse.path = req.activity.entry.path();
		if (xourse.path) {
		    xourse.path = xourse.path.replace(/\.html$/,'')
		}		
		xourse.hash = req.activity.blob.id().toString();
		res.render('xourse', { xourse: xourse,
				       repositoryName: req.repositoryName });
		return;
	    }

	    activity.freshestCommit = req.activity.freshestCommit;
	    activity.commit = req.activity.sourceSha;
	    activity.path = req.activity.entry.path();
	    if (activity.path) {
		activity.path = activity.path.replace(/\.html$/,'')
	    }
	    
	    if (req.activity.xourse) {
		console.log("req.activity.xourse=",req.activity.xourse);
		parseXourseBlob( req.activity.xourse.blob, function(err,xourse) {
		    xourse.path = req.activity.xourse.entry.path();
		    xourse.hash = req.activity.xourse.blob.id().toString();
		    
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

		    console.log("req.repositoryMetadata=",req.repositoryMetadata);
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
	});
	
    } else {
	res.status(500).send('missing entry');	
    }
	
};

exports.recentCommitsOnBranch = function(branch, req, res, next) {
    console.log("Searching for recent commits on " + branch);
    var repository = req.repository;
    var revwalk = nodegit.Revwalk.create(repository);
    var result = revwalk.pushRef("refs/heads/" + branch);
    revwalk.sorting(nodegit.Revwalk.SORT.TOPOLOGICAL | nodegit.Revwalk.SORT.TIME);

    var commit = undefined;
    // BADBAD: this is pretty deep -- should I really go this far back?
    var commitDepth = 100;
    
    revwalk.getCommits(commitDepth).then(function(sourceCommits) {
	async.map( sourceCommits, function(sourceCommit, callback) {
	    nodegit.Reference.lookup(repository, "refs/tags/publications/" + sourceCommit.sha()).then(function(reference) {
		var oid = reference.target();
		repository.getCommit(oid).then(function(commit) {
		    callback(null, {commit: commit, sha: commit.sha(), sourceCommit: sourceCommit, sourceSha: sourceCommit.sha()});
		});
	    }).catch( function(err) {
		callback(null, null);
	    });	    
	}, function(err, results) {
	    // BADBAD: missing error handling
	    req.commits = results.filter( function(x) { return x != null; } );
	    next();	    
	});
    });    
};

// This also needs to deal with whatever the most recent state is for the user
exports.recentCommitsOnMaster = function(req, res, next) {
    return exports.recentCommitsOnBranch("master", req, res, next);
};

// choose a specific commit based on the user's available states,
// unless there is a ?sha after the url, in which case we should just
// use that specic blob.  we also should mark if we need to update?
exports.chooseMostRecentBlob = function(req, res, next) {
    var activities = req.activities;
    var activityHashes = undefined;
    console.log("activities=",activities);
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
		console.log("activityHashes=",activityHashes);
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
		    console.log("states.length=",states.length);
		    console.log("states=",states);		    
		    states = states.sort( function(a,b) {
			return activityHashes.indexOf( a.activityHash ) - activityHashes.indexOf( b.activityHash );
		    });
		    console.log("states sorted=",states);		    		    
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
		console.log("req.activity=",activity);
		req.activity = activity;
		next();
	    }
	});
       
    console.log("query",req.query);
};

exports.serve = function( mimetype ) {
    return function(req, res) {
	var file = req.activities[0];
	var data = file.blob.content();
	res.contentType( mimetype );
	res.end( data, 'binary' );		
    };
};

exports.source = function(req, res) {
    var file = req.activities[0];
    file.data = file.blob.content();
    file.path = file.entry.path();
    res.render('source', { file: file });
};

exports.ltiConfig = function(req, res) {
    var file = req.activities[0];
    
    //file.data = file.blob.content();
    //file.path = file.entry.path();
    
    var hash = {
	title: 'Ximera ' + file.entry.path().replace(/\.html$/,''),
	description: '',
	launchUrl: exports.rootUrl + '/lms',
	xourse: { repositoryName: req.repositoryName,
		  path: file.entry.path().replace(/\.html$/,'')
		},
	domain: url.parse(exports.rootUrl).hostname
    };
        
    res.render('lti/config', hash);
};


// We should be caching this somewhere, and then invalidating the
// cache whenever we push something to the given repo.
exports.findPossibleActivityFromCommits = function(req, res, next) {
    console.log("Identify possible activities from among the commits.");
    var parts = req.params.path.split('/');
    
    var possiblePaths = [];

    for (var i = 0; i <= parts.length; i++) {
	var partialPath = parts.slice(0,i).join('/');
	var remainder = parts.slice(i).join('/');
	
	possiblePaths.push( {path: partialPath + '.html', remainder: remainder} );
	possiblePaths.push( {path: partialPath + '.html', remainder: remainder + '.html'} );
    }

    var activities = req.commits;

    async.map(
	activities,
	function(activity, callback) {
	    activity.commit.getTree().then(function(tree) {
		activity.tree = tree;
		async.detectSeries(possiblePaths, function(item, callback) {
		    tree.getEntry(item.remainder).then(function(treeEntry) {
			activity.entry = treeEntry;
			
			if (treeEntry.isTree()) {
			    console.log("****************************************************************");
			    console.log("TREE =", item.remainder);
			}
			
			// BADBAD: assuming it is a blob and not a tree!
			// a directory of activities would be a tree!
			treeEntry.getBlob().then(function(blob) {
			    activity.blob = blob;
			    activity.activityHash = blob.id().toString();
			    tree.getEntry(item.path).then(function(treeEntry) {
				activity.xourse = {entry: treeEntry};
				treeEntry.getBlob().then(function(blob) {
				    activity.xourse.blob = blob;
				    callback(null,true);
				}).catch(function(err) {
				    callback(null,false);
				});
			    }).catch(function(err) {
				callback(null,false);
			    });
			}).catch(function(err) {
			    callback(null,false);
			});;			    
		    }).catch( function(err) {
			callback(null,false);
		    });
		}, function(err, result) {
		    callback(err, activity);
		});
	    }).catch( function(err) {
		callback(err, null);		
	    });
	}, function(err, results) {
	    console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%" );
	    console.log(results);
	    req.activities = results;
	    next();
	});
};

exports.fetchMetadata = function(req, res, next) {
    var activity = req.activity;

    activity.tree.getEntry("metadata.json").then(function(treeEntry) {
	treeEntry.getBlob().then(function(blob) {
	    req.repositoryMetadata = JSON.parse(blob.content());
	    next();
	});
    });
};
