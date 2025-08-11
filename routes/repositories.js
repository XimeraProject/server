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
var page = require('./page');
var backend = require('git-http-backend');
var spawn = require('child_process').spawn;
var debug = require('debug')('repositories')

var config = require('../config');
var gitRepositoriesRoot = config.repositories.root;

////////////////////////////////////////////////////////////////
// We use both cachify (to simplify some caching) and also a
// connection to redis (to handle expiry)
var cachify = require('./cachify');
const Redis = require("ioredis");
var state = require('./state');

// create a new redis client and connect to our local redis instance
var client = new Redis ({ host: config.redis.url, port: config.redis.port });

// if an error occurs, print it to the console
client.on('error', function (err) {
    console.log("Error " + err);
});

var repositoryCache = {};

exports.normalizeName = function( req, res, next ) {
    if (req.params.repository)
	req.params.repository = req.params.repository.replace( /[^0-9A-Za-z-\*]/, '' ).toLowerCase();
    next();
}

function invalidateRepositoryCache(repositoryName) {
    delete repositoryCache[repositoryName];

    client.smembers("activities:" + repositoryName, 
		  function (err, items) {
		      if (err) {
		      } else {
			  // BADBAD: it'd be better if this were not blocking
			  if (items.length > 0)
			      client.del(items);
			  
			  client.del("activities:" + repositoryName);

			  state.push( repositoryName );
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

    if ((req.query) && (req.query.service == 'git-upload-pack')) {
	req.query = {};
	req.url = req.url.replace( /\?.*/, '' );
    }
    
    // If they didn't ask for a service, just provide the dumb protocol
    if ((Object.keys(req.query).length == 0) && (req.method == 'GET')) {
	if (req.url.match(/^\/objects\/[0-9a-f]{2}\/[0-9a-f]{38}$/) ||
	    req.url.match(/^\/objects\/pack\/pack-[0-9a-f]{40}.(pack|idx)$/) ||
	    req.url.match(/^\/objects\/info\/packs$/) ||
	    req.url.match(/^\/HEAD$/) ||
	    req.url.match(/^\/info\/refs$/)) {
	    res.sendFile(path.join(dir + req.url));
	    return;
	}

	if (req.url.match(/objects\/info\/http-alternates/)) {
	    res.status(200).send('');
	    return;
	}

	res.sendStatus(500);
	
	return;
    }
    
    req.pipe(backend(req.url, function(err, service) {
	if (err) {
	    res.statusCode = 500;
	    res.end(err + '\n');
	    return;
	}
	
	res.setHeader('content-type', service.type);

	// If the request is to modify our repository in some form...
	if (service.cmd !== 'git-upload-pack') {
	    // Only then do we require that a bearer token be presented
	    page.authorization( req, res, function(err) {
		if (err) {
		    res.status(500).send(err);
		} else {
		    var ps = spawn(service.cmd, service.args.concat(dir));
		    ps.stdout.pipe(service.createStream()).pipe(ps.stdin);

		    ps.on('close', (code) => {
			// After we've recevied data, we should create the info files
			spawn("git",
			      ["update-server-info"],
			      { cwd: dir });

			// And tell the user that they should reload
			invalidateRepositoryCache( repositoryName );
		    });
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
	    repository.config().then(function(config) {
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


async function recentCommitsOnBranch(repository, branchName) {
    const MAX_COMMITS = 100;
    const TAG_PREFIX = "refs/tags/publications/";

    try {
        const revwalk = nodegit.Revwalk.create(repository);
        revwalk.pushRef("refs/heads/" + branchName);
        revwalk.sorting(nodegit.Revwalk.SORT.TOPOLOGICAL | nodegit.Revwalk.SORT.TIME);

        const sourceCommits = await revwalk.getCommits(MAX_COMMITS);

        const resultPromises = sourceCommits.map(async (sourceCommit) => {
            const tagRefName = TAG_PREFIX + sourceCommit.sha();

            try {
                const reference = await nodegit.Reference.lookup(repository, tagRefName);
                const targetCommit = await repository.getCommit(reference.target());

                return {
                    commit: targetCommit,
                    sha: targetCommit.sha(),
                    sourceCommit: sourceCommit,
                    sourceSha: sourceCommit.sha(),
                };
            } catch (err) {
                // Tag not found or lookup failed — ignore silently
                return null;
            }
        });

        const results = await Promise.all(resultPromises);
        return results.filter(entry => entry !== null);
    } catch (err) {
        throw new Error("Failed to retrieve recent commits: " + err.message);
    }
}


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
        debug("CACHE " + pathname);
    
	client.get(key, function(err, result) {
	    if (err) {
		reject(err);
	    } else {
		if (result) {
		    // console.log("CACHE GOT" +result);
		    resolve( JSON.parse(result) );
		} else {
		    exports.activitiesFromRecentCommits(repositoryName, branchName, pathname)
			.then( function(activities) {
			    client.setex(key, 31557600, JSON.stringify(activities) );
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
	    // console.log('COMMITS');
	    // console.log(commits);
	    var parts = pathname.split('/');
    
	    var possiblePaths = [];

	    for (var i = 0; i <= parts.length; i++) {
		var partialPath = parts.slice(0,i).join('/');
		var remainder = parts.slice(i).join('/');
		
		debug('Path '+partialPath+ " || "+remainder+'(.html)');
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
				return tree.getEntry(item.remainder).then(function(treeEntry) {
				    // BADBAD: assuming it is a blob and not a tree!
				    // a directory of activities would be a tree!
				    if (treeEntry.isBlob()) {
					activity.activityHash = treeEntry.sha();
					activity.hash = treeEntry.sha();
					activity.path = treeEntry.path();

					return exports.downloadsFromActivity(repositoryName, activity.path, tree)
					.then(downloads => activity.downloads = downloads)
					.then(() => {
						return tree.getEntry(item.path).then(function(treeEntry) {
							activity.xourse = {path: treeEntry.path()};
							if (treeEntry.isBlob()) {
								debug('Found xourse '+treeEntry.path());
								activity.xourse.hash = treeEntry.sha();

								return exports.downloadsFromActivity(repositoryName, treeEntry.path(), tree)
								.then(downloads => { 
									activity.downloads_xourse = downloads
									return activity.tree.getEntry("metadata.json")
										.then(function(treeEntry) {
											if (treeEntry.isBlob()) {
												activity.metadataHash = treeEntry.sha();
											}
									
											callback(null,true);
										}).catch(function(err) {
											// Even without metadata, we're okay.
											console.log("No metadata.json for "+activity.path)
											callback(null,true);
										});
								});
							} else {
							callback(null,false);
							}
						})
					}).catch(function (err) {
						callback(null, false);
					})
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
			//console.log('RESULTS:');
			//console.log(results);
			resolve(results);
		    });
	    });
	});
};

exports.downloadsFromActivity = function (repository, path, tree) {
	const activityFilePathWithoutExtension = path.split('.').slice(0, -1).join('.')
	debug('DOWNLOADS '+path);
	return new Promise((resolve, reject) => {
		try{
			var treeEntry = tree.entryByName('ximera-downloads');
			if(treeEntry.isTree()){
				return treeEntry.getTree().then(function (tree) {
					var walker = tree.walk();
					walker.on('end', function (trees) {
						//debug("WALK "+activityFilePathWithoutExtension)
						const entries = trees.map(t => t.path())
							.map(p => ({ p, m: p.match(`ximera-downloads/(([^/]*)/${activityFilePathWithoutExtension}\\..*)$`) }))
							.filter(({m}) => m)
							.map(({p, m}) => {
								const label = m[2]
								return { label, url: config.toValidPath('/' + repository + '/' + p) }
							})
						//debug("FOUND", entries);
						resolve(entries)
					});
					// Don't forget to call `start()`!
					walker.start();
				});			
			}
			resolve([])
		} catch(e){
			// Happens when 'ximera-downloads' folder doesn't exist
			console.log("No ximera-downloads folder for "+path)
			resolve([])
		}
	})
};

exports.mostRecentMetadataOnBranch = function( repositoryName, branchName ) {
    return new Promise( function(resolve, reject) {
	openRepository( repositoryName )
	    .then( function(repository) {
		return recentCommitsOnBranch( repository, branchName );
	    })
	    .then( function(commits) {
		return commits[0].commit.getTree();
	    })
	    .then( function(tree) {
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

exports.getRepositories = function() {
	var repositoriesPath = path.resolve(gitRepositoriesRoot);
	return Promise.all(fs.readdirSync(repositoriesPath, { withFileTypes: true })
			.filter(f => f.isDirectory())
			.map(f => f.name.match(new RegExp('(.*)\\.git')))
			.filter(m => m)
			.map(m => { return { name: m[1], deleteable: m[1].indexOf('*') > -1 } })
			.map(r => new Promise(function (resolve, reject) {
				openRepository(r.name)
					.then(function (repository) {
						return recentCommitsOnBranch(repository, 'master')
					})
					.then(function (commits) {
						resolve({
							...r,
							lastCommitInfo: (commits.length > 0) ? commits[0].commit.committer().toString(true) : '',
							lastCommitDate: (commits.length > 0) ? commits[0].commit.date() : ''
						})
					}).catch(function (err) {
						console.error(err)
						resolve({
							...r,
							lastCommitInfo: '',
							lastCommitDate: ''
						})
					});
				})
			)).then(repos => {
				const sorted = [...repos].sort((r1, r2) => {
					if (r1.lastCommitDate !== '' && r2.lastCommitDate !== '')
						return -r1.lastCommitDate.toISOString().localeCompare(r2.lastCommitDate.toISOString())
					else if (r1.lastCommitDate === '' && r2.lastCommitDate === ''){
						return r1.name.localeCompare(r2.name)
					} else if (r1.lastCommitDate === ''){
						return -1
					} else if (r2.lastCommitDate === '') {
						return 1
					}
				})
				return sorted
			})
}

exports.remove = function (repo) {
	if(repo.indexOf('*') > -1){
		var repositoryPath = path.resolve(gitRepositoriesRoot, `${repo}.git`);
		invalidateRepositoryCache(repo)
		fse.removeSync(repositoryPath)
	}
}
