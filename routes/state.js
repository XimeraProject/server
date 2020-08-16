var winston = require('winston');
var jsondiffpatch = require('jsondiffpatch');
var mdb = require('../mdb');
var util = require('util');
var crypto = require('crypto');
var repositories = require('./repositories');
var mongo = require('mongodb');
var unique = require('uniq');

var CANON = require('canon');
var XXHash = require('xxhash');
function checksumObject(object) {
    return XXHash.hash( Buffer.from(CANON.stringify( object )), 0x1337 ).toString(16);
}

exports.wss = undefined;

var redis = require('redis');
var client = redis.createClient();

exports.getCompletions = function(req, res, next) {
    if (!req.user) {
	next('No user logged in.');
    } else {
        mdb.Completion.find({user: req.user._id}, { activityPath: 1, repositoryName: 1, complete: 1 },
                            function (err, completions) {
                                console.log(err);
                                if (err)
                                    next(err);
                                else {
                                    res.json(completions);
                                }
                            });
    }
};

exports.putCompletion = function(req, res, next) {
    var repositoryName = req.params.repository;

    if (!req.user) {
	next('No user logged in.');
    } else {
	let query = {activityPath: req.params.path,
		     repositoryName: req.params.repository,
		     user: req.user._id};
	
        mdb.Completion.update(query,
                              {$set: {complete: req.body.complete,
                                      date: new Date()}}, {upsert: true},
                              function (err, affected, raw) {
                                  res.json({ok:true});
                              });
    }
};

exports.getCommit = function(req, res, next) {
    var repositoryName = req.params.repository;

    repositories.activitiesFromRecentCommitsOnMaster( repositoryName, req.params.path ).then( function(activities) {
        res.json(
            { sourceSha: activities[0].sourceSha,
              hash: activities[0].hash
            });
    });
};

exports.getState = function(req, res, next) {
    if (!req.user) {
	next('No user logged in.');
    } else {
        const query = {
            activityHash: req.params.activityHash,
            user: req.user._id
        };

        const uuid = req.params.uuid;
        const key = `shadow:${req.user._id}:${req.params.activityHash}:${uuid}`;
        
        mdb.State.findOne(query, function(err, state) {
            if (err) {
                next(err);
            } else {
                if (state) {
                    client.set(key, JSON.stringify(state.data), 'EX', 3600);
                    res.status(200).json(state.data);
                } else {
                    client.set(key, '{}', 'EX', 3600);
                    res.status(200).json({});
                }
            }
        });
    }
};

exports.patchState = function(req, res, next) {
    if (!req.user) {
	next('No user logged in.');
    } else {
        let thePatch = req.body;
        if (req.header('Content-Type') !== 'application/json') thePatch = undefined;

        const query = {
            activityHash: req.params.activityHash,
            user: req.user._id
        };
        
        mdb.State.findOne(query, function(err, stateObject) {
            if (err) {
                next(err);
            } else {
                let state = (stateObject === null) ? {} : stateObject.data;

                const uuid = req.params.uuid;
                const key = `shadow:${req.user._id}:${req.params.activityHash}:${uuid}`;
                
                client.get(key, (err, shadowJSON) => {
                    if (err) return res.status(500).send('Error fetching shadow');

                    if (shadowJSON) {
                        const shadow = JSON.parse(shadowJSON);

                        const checksum = req.header('Ximera-Shadow-Checksum');
                        if (checksumObject(shadow) !== checksum) {
                            return res.status(422).send('Shadow inconsistent with provided checksum');
                        }

                        // Only patch if we have a patch
                        if (thePatch !== undefined) {
                            // update the shadow, which should not fail since we
                            // verified a checksum
                            try {
	                        jsondiffpatch.patch(shadow, thePatch);
                            } catch (e) {
                                return res.status(500).send('Could not patch the server shadow');
                            }
                            client.set(key, JSON.stringify(shadow), 'EX', 3600);
                            
	                    // fuzzypatch the true state, which can fail
	                    try {
	                        jsondiffpatch.patch(state, thePatch);
	                    } catch (e) {
	                    }
                            
                            mdb.State.update(query, {$set: {data: state}}, {upsert: true}, function (err, affected, raw) {
	                    });
                        }
                        
                        // Send the client any updates, in the form of a patch
                        const delta = jsondiffpatch.diff(shadow, state);
                        
                        if (delta !== undefined) {
                            client.set(key, JSON.stringify(state), 'EX', 3600);
                            res.set('Ximera-Shadow-Checksum', checksumObject(shadow));
                            return res.status(200).json(delta);
	                }
                        
                        // we're in sync, so send "no content"
                        return res.status(204).send();
                    }
                    
                    // Shadow is missing -- there isn't much we can do.
                    return res.status(422).send('Missing shadow');
                });
            }
        });
    }
};
