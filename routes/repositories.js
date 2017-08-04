/* Accessing the repositories stored on the filesystem through nodegit
 * is tragically slow.  This module, by acting as an intermediary to
 * everything nodegit, provides us with an opportunity to cache its
 * output (and invalidate that cache whenever we receive a push). 
 */

var async = require('async');
var nodegit = require('nodegit');
var path = require('path');
var fse = require("fs-extra");
var fs = require("fs");
var crypto = require('crypto');
var git = require('./git');
var backend = require('git-http-backend');
var spawn = require('child_process').spawn;

var config = require('../config');
var gitRepositoriesRoot = config.repositories.root;

////////////////////////////////////////////////////////////////
// We use both cachify (to simplify some caching) and also a
// connection to redis (to handle expiry)
var cachify = require('./cachify');
var redis = require('redis');

// create a new redis client and connect to our local redis instance
var client = redis.createClient();

// if an error occurs, print it to the console
client.on('error', function (err) {
    console.log("Error " + err);
});


function normalizeRepositoryName( name ) {
    return name.replace( /[^0-9A-Za-z-]/, '' ).toLowerCase();
}

exports.normalizeRepositoryName = normalizeRepositoryName;

var repositoryCache = {};

function invalidateRepositoryCache(repositoryName) {
    delete repositoryCache[repositoryName];

    client.smembers("activities:" + repositoryName, 0, -1,
		  function (err, items) {
		      if (err) {
		      } else {
			  client.del(items);
			  client.del("activities:" + repositoryName);
		      }
		  });
};

function openRepository(repositoryName) {
    var repositoryPath = path.resolve(gitRepositoriesRoot, repositoryName + '.git');

    return new Promise( function(resolve,reject) {
	if (repositoryName in repositoryCache) {
	    resolve( repositoryCache[repositoryName] );
	} else {
	    fs.stat(repositoryPath, function (err, stats){
		if (err || !stats.isDirectory()) {
		    if (err)
			reject(err);
		    else
			reject('The repository is not a directory.');
		} else {
		    repositoryCache[repositoryName] = nodegit.Repository.openBare(repositoryPath);
		    resolve( repositoryCache[repositoryName] );
		}
	    });
	}
    });
};

// BADBAD: should normalize repositoryname here
exports.git = function(req, res) {
    var repositoryName = req.params.repository;
    var dir = path.join(gitRepositoriesRoot, repositoryName + '.git');

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
	    // Only then do we require that a bearer token be presented
	    git.authorization( req, res, function(err) {
		if (err) {
		    console.log( err );
		    res.status(500).send(err);
		} else {
		    invalidateRepositoryCache( repositoryName );

		    var ps = spawn(service.cmd, service.args.concat(dir));
		    ps.stdout.pipe(service.createStream()).pipe(ps.stdin);
		}
	    });
	} else {
	    var ps = spawn(service.cmd, service.args.concat(dir));
	    ps.stdout.pipe(service.createStream()).pipe(ps.stdin);
	}
    })).pipe(res);
};

exports.readRepositoryToken = function( repositoryName ) {
    var repositoryPath = path.resolve(gitRepositoriesRoot, repositoryName + '.git');

    return new Promise( function(resolve, reject) {
	nodegit.Repository.openBare(repositoryPath).then(function(repository) {
	    repository.configSnapshot().then(function(config) {
		config.getStringBuf('ximera.token').then(function(buf) {
		    resolve(buf);
		}).catch(function(e) {
		    reject('Repository ' + repositoryName + '.git is missing a Ximera token.');
		});
	    });
	}).catch(function(e) {
	    reject('Repository ' + repositoryName + '.git not found.');
	});
    });
};

function makeTokenForKey( repository, keyid ) {
    return new Promise( function(resolve, reject) {
	repository.config().then(function(config) {
	    // Use config
	    crypto.randomBytes(48, function(err, buffer) {
		var token = buffer.toString('base64');
		config.setString ('ximera.keyid', keyid).
		    then(function(result) {
			config.setString ('ximera.token', token);
			resolve(token);
		    });
	    });
	}).catch(function(e) {
	    reject('Could not save token.');
	});
    });
}

exports.create = function(repositoryName, givenKeyid) {
    var repositoryPath = path.resolve(gitRepositoriesRoot, repositoryName + '.git');

    return new Promise( function(resolve, reject) {
	nodegit.Repository.open(repositoryPath).then(function(repository) {
	    // Repository already exists.
	    repository.config().then(function(config) {
		config.getStringBuf('ximera.keyid').then(function(keyid) {
		    if (keyid == givenKeyid)
			resolve(makeTokenForKey( repository, keyid ));
		    else
			reject('You do not own the repository.'); // 403
		}).catch(function(e) {
		    reject('Repository ' + repositoryName + '.git is missing a GPG key fingerprint.'); // 404
		});
	    });
	}).catch(function(e) {
	    fse.ensureDir(repositoryPath, function(err) {
		if (err) {
		    reject(err); // 400
		} else {
		    nodegit.Repository.init(repositoryPath, 1).then(function(repository) {
			resolve(makeTokenForKey( repository, givenKeyid ));
		    }).catch(function(e) {
			reject('Could not create repository.'); //  409
		    });
		}
	    });
	});
    });
};


function recentCommitsOnBranch(repository, branchName) {
    var revwalk = nodegit.Revwalk.create(repository);
    var result = revwalk.pushRef("refs/heads/" + branchName);
    revwalk.sorting(nodegit.Revwalk.SORT.TOPOLOGICAL | nodegit.Revwalk.SORT.TIME);

    var commit = undefined;
    // BADBAD: this is pretty deep -- should I really go this far back?
    var commitDepth = 100;

    return new Promise( function(resolve, reject) {
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
		if (err)
		    reject(err);
		else
		    resolve( results.filter( function(x) { return x != null; } ) );
	    });
	});
    });
};

// We never need to invalidate blobs, because blobs are keyed by a
// hash of their content
exports.readBlob = function(repositoryName, blobHash) {
    return new Promise( function(resolve, reject) {
	cachify.string( "blob:" + blobHash,
			function(callback) {
			    openRepository( repositoryName )
				.then( function(repository) {
				    return nodegit.Blob.lookup(repository, blobHash);
				})
				.then( function(blob) {
				    callback(null, blob.content());
				})
				.catch( function(err) {
				    callback(err);
				});
			}, function(err, blob) {
			    if (err)
				reject(err);
			    else
				resolve(blob);
			});
    });
};

exports.activitiesFromRecentCommitsOnMaster = function(repositoryName, pathname) {
    return exports.cachedActivitiesFromRecentCommits(repositoryName, "master", pathname);
};

exports.cachedActivitiesFromRecentCommits = function(repositoryName, branchName, pathname) {
    return new Promise( function(resolve, reject) {
	var key = "activities:" + repositoryName + ":" + branchName + "/" + pathname;
    
	client.get(key, function(err, result) {
	    if (err) {
		reject(err);
	    } else {
		if (result) {
		    resolve( JSON.parse(result) );
		} else {
		    exports.activitiesFromRecentCommits(repositoryName, branchName, pathname)
			.then( function(activities) {
			    client.set(key, JSON.stringify(activities) );
			    client.sadd("activities:" + repositoryName, key);
			    resolve(activities);
			})
			.catch( function(err) {
			    reject(err);
			});
		}
	    }
	});
    });
};

// We should be caching this somewhere, and then invalidating the
// cache whenever we push something to the given repo.
exports.activitiesFromRecentCommits = function(repositoryName, branchName, pathname) {
    return openRepository( repositoryName )
	.then( function(repository) {
	    return recentCommitsOnBranch( repository, branchName );
	})
	.then( function(commits) {
	    var parts = pathname.split('/');
    
	    var possiblePaths = [];

	    for (var i = 0; i <= parts.length; i++) {
		var partialPath = parts.slice(0,i).join('/');
		var remainder = parts.slice(i).join('/');
		
		possiblePaths.push( {path: partialPath + '.html', remainder: remainder} );
		possiblePaths.push( {path: partialPath + '.html', remainder: remainder + '.html'} );
	    }
	    
	    var activities = commits;

	    return new Promise( function(resolve, reject) {
		async.map(
		    activities,
		    function(activity, callback) {
			activity.commit.getTree().then(function(tree) {
			    activity.tree = tree;

			    async.detectSeries(possiblePaths, function(item, callback) {
				tree.getEntry(item.remainder).then(function(treeEntry) {
				    //activity.entry = treeEntry;
				    
				    // BADBAD: assuming it is a blob and not a tree!
				    // a directory of activities would be a tree!
				    if (treeEntry.isBlob()) {
					activity.activityHash = treeEntry.sha();
					activity.hash = treeEntry.sha();
					activity.path = treeEntry.path();
					
					tree.getEntry(item.path).then(function(treeEntry) {
					    activity.xourse = {path: treeEntry.path()};
					    if (treeEntry.isBlob()) {
						activity.xourse.hash = treeEntry.sha();

						activity.tree.getEntry("metadata.json")
						    .then(function(treeEntry) {
							if (treeEntry.isBlob()) {
							    activity.metadataHash = treeEntry.sha();
							}
							
							callback(null,true);
						    }).catch(function(err) {
							// Even without metadata, we're okay.
							callback(null,true);
						    });
					    } else {
						callback(null,false);
					    }
					}).catch(function(err) {
					    callback(null,false);
					});
				    } else {
					callback(null,false);					
				    }
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
			resolve(results);
		    });
	    });
	});
};

exports.mostRecentMetadataOnBranch = function( repositoryName, branchName ) {
    return new Promise( function(resolve, reject) {
	openRepository( repositoryName )
	    .then( function(repository) {
		return recentCommitsOnBranch( repository, branchName );
	    })
	    .then( function(commits) {
		console.log(commits);
		return commits[0].commit.getTree();
	    })
	    .then( function(tree) {
		console.log(tree);
		return tree.getEntry("metadata.json");
	    }).then( function(entry) {
		return entry.getBlob();
	    }).then( function(blob) {
		resolve(blob.content());
	    }).catch( function(err) {
		reject(err);
	    });
    });
};
