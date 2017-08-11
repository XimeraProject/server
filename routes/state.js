var winston = require('winston');
var jsondiffpatch = require('jsondiffpatch');
var mdb = require('../mdb');
var util = require('util');
var redis = require('redis');
var crypto = require('crypto');

var CANON = require('canon');
var XXHash = require('xxhash');
function checksumObject(object) {
    return XXHash.hash( Buffer.from(CANON.stringify( object )), 0x1337 ).toString(16);
}

// create a new redis client and connect to our local redis instance
var client = redis.createClient();
// if an error occurs, print it to the console
client.on('error', function (err) {
    console.log("Error " + err);
});

module.exports = function(io) {
    var exports = {};

    ////////////////////////////////////////////////////////////////
    function differentialSynchronization( userId, activityHash ) {
	mdb.State.findOne({activityHash: activityHash, user: userId} , function(err, state) {
	    if (err || (!state))
		return;

	    var data = state.data;
	    
	    var roomName = `/users/${userId}/state/${activityHash}`;
	    var room = io.sockets.adapter.rooms[roomName];
	    if (!room) return;
	    
	    Object.keys(room.sockets).forEach( function(id) {		
		var shadowKey = `shadow:${userId}:${activityHash}:${id}`;
		client.get(shadowKey, function(err, shadowState) {
		    if (err || (!shadowState))
			return;

		    shadowState = JSON.parse(shadowState);

		    // Send a diff if needed
		    var delta = jsondiffpatch.diff(shadowState, data);

		    if (delta !== undefined) {
			io.to(id).emit('patch', delta, checksumObject( shadowState ) );
			winston.info( `DS patch for /users/${userId}/state/${activityHash} for socket ${id}` );
			client.setex(shadowKey, 60*60, JSON.stringify(data) );
		    }
		});
	    });
	});
    }
    
    io.on('connect', function( socket ) {

	socket.on('watch', function(userId, activityHash) {
	    // BADBAD: Need some security here...

	    if (userId == null) {
		userId = socket.handshake.session.guestUserId;
		if (socket.handshake.session.passport) {
		    userId = socket.handshake.session.passport.user || userId;
		}
	    }
	    
	    winston.info( "heard 'watch' for userId = " + userId );
	    
	    socket.userId = userId;
	    socket.activityHash = activityHash;
	    
	    var roomName = `/users/${userId}/state/${activityHash}`;
	    socket.join( roomName );

	    // do this via the sync commands
	    var shadowKey = `shadow:${userId}:${activityHash}:${socket.id}`;	    
	    mdb.State.findOne({activityHash: activityHash, user: userId} , function(err, state) {
		if (err || (!state)) return;
		client.setex(shadowKey, 60*60, JSON.stringify(state.data) );
		socket.emit('initial-sync', state.data);
	    });
	});

	// Syncing only updates the shadows
	socket.on('sync', function(data) {
	    var userId = socket.userId;
	    var activityHash = socket.activityHash;
	    
	    if ( (!activityHash) || (!userId) )
		return;

	    var shadowKey = `shadow:${userId}:${activityHash}:${socket.id}`;
	    client.setex(shadowKey, 60*60, JSON.stringify(data) );
	});
	
	socket.on('out-of-sync', function() {
	    var userId = socket.userId;
	    var activityHash = socket.activityHash;
	    
	    if ( (!activityHash) || (!userId) )
		return;
	    
	    var shadowKey = `shadow:${userId}:${activityHash}:${socket.id}`;
	    client.get(shadowKey, function(err, shadowState) {
		socket.emit('sync',JSON.parse(shadowState));
	    });
	});

	socket.on('blargh', function() {
            mdb.State.update({activityHash: activityHash, user: userId},
			     {$set: {data: data}}, {upsert: true}, function (err, affected, raw) {
			     });
	    
	    mdb.State.findOne({activityHash: activityHash, user: userId}, function(err, document) {
		if (document) {
		    // If the document isn't any good, just send an empty hash {}
		    if (document.data)
			socket.emit('sync',document.data);
		    else
			socket.emit('sync',{});			
		}
		else {
                    // If there is nothing in the database, give the client an empty hash
		    socket.emit('sync',{});					    
		}
            });
	});
	
	socket.on('patch', function(delta, checksum, truth) {
	    var userId = socket.userId;
	    var activityHash = socket.activityHash;
	    
	    if ( (!activityHash) || (!userId) )
		return;
	    
	    // Apply patch to the server state
	    mdb.State.findOne({activityHash: activityHash, user: userId} , function(err, state) {
		var data;
		
		if (err || (!state))
		    data = {};
		else
		    data = state.data;
		    
		// fuzzypatch the object, which can fail
		try {
		    jsondiffpatch.patch(data, delta);
		} catch (e) {
		    console.log("state diff failed");
		}
		
		mdb.State.update({activityHash: activityHash, user: userId}, {$set: {data: data}}, {upsert: true}, function (err, affected, raw) {
		    // Apply patch to the shadow state

		    // This requiers a WATCH and a MULTI to ensure
		    // that our diff is atomic;
		    // cf. https://blog.yld.io/2016/11/07/node-js-databases-using-redis-for-fun-and-profit/
		    var shadowKey = `shadow:${userId}:${activityHash}:${socket.id}`;
		    client.get(shadowKey, function(err, shadowState) {
			if (err || (!shadowState))
			    shadowState = data;
			else {
			    shadowState = JSON.parse(shadowState);
			    
			    if (checksumObject(shadowState) != checksum) {
				console.log( "We are out of sync: "  );
				console.log( checksumObject(shadowState) );
				console.log( checksum );
				console.log( "our shadow = " + JSON.stringify( shadowState ) );
				console.log( "their shadow = " + JSON.stringify( truth ) );				
				socket.emit( 'out-of-sync' );				
			    }

			    // This really shouldn't fail
			    try {
				jsondiffpatch.patch(shadowState, delta);
			    } catch (e) {
				console.log("SHADOW state diff failed");
				console.log( "ShadowState = ",
					     JSON.stringify(shadowState) );
				console.log( "delta = ",
					     JSON.stringify(delta) );
			    }			    
			}
			
			// Store patched shadow
			client.setex(shadowKey, 60*60, JSON.stringify(shadowState) );

			differentialSynchronization( userId, activityHash );
		    });
		});
	    });
	});
    });

		      
    exports.completion = function(req, res) {
	if (!req.user) {
            res.status(500).send("");
	}
	else {
	    var query = {activityHash: req.params.activityHash,
			 user: req.user._id};

	    if (req.body.activityPath) {
		query = {activityHash: req.params.activityHash,
			 activityPath: req.body.activityPath,
			 repositoryName: req.body.repositoryName,
			 user: req.user._id};
	    }

            mdb.Completion.update(query, {$set: {complete: req.body.complete, date: new Date()}}, {upsert: true}, function (err, affected, raw) {
		if (err) {
		    res.status(500).json(err);
		} else
		    res.json({ok: true});
            });
	}
    };

    exports.getCompletions = function(req, res) {
	if (!req.user) {
	    res.json({});
	}
	else {
	    if (req.user._id.toString() != req.params.id)
		res.json({});
	    else
		mdb.Completion.find({user: req.user._id}, function (err, completions) {
		    res.json(completions);
		});
	}
    };
    
    exports.remove = function(req, res) {
	if (!req.user) {
            res.status(500).send("");
	}
	else {
            mdb.State.update({activityHash: req.params.activityHash, user: req.user._id}, {$set: {data: {}}}, {upsert: true}, function (err, affected, raw) {
		res.json({ok: true});
            });
	}
    }


    return exports;
};
