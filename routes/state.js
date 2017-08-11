var winston = require('winston');
var jsondiffpatch = require('jsondiffpatch');
var mdb = require('../mdb');
var util = require('util');
var crypto = require('crypto');

var CANON = require('canon');
var XXHash = require('xxhash');
function checksumObject(object) {
    return XXHash.hash( Buffer.from(CANON.stringify( object )), 0x1337 ).toString(16);
}

module.exports = function(io) {
    var exports = {};

    io.on('connect', function( socket ) {

	socket.on('watch', function(userId, activityHash) {
	    // BADBAD: Need some security here...
	    console.log( "BADBAD: no security checks for " + userId );
	    
	    if (userId == null) {
		userId = socket.handshake.session.guestUserId;
		if (socket.handshake.session.passport) {
		    userId = socket.handshake.session.passport.user || userId;
		}
	    }

	    mdb.Completion.find({user: userId}, { activityPath: 1, repositoryName: 1, complete: 1 }, function (err, completions) {
		if (!err && completions)
		    socket.emit('completions', completions);
	    });

	    socket.userId = userId;
	    socket.userRoom = `/users/${userId}`;
	    socket.join( socket.userRoom );

	    if (!activityHash)
		return;
	    
	    socket.activityHash = activityHash;
	    
	    var roomName = `/users/${userId}/state/${activityHash}`;
	    socket.activityRoom = roomName;
	    socket.join( roomName );

	    mdb.State.findOne({activityHash: activityHash, user: userId}, function(err, state) {
		if (err || (!state))
		    state = {data: {}};
		socket.shadow = state.data;
		socket.emit('sync', state.data);
	    });
	});

	socket.on('want-differential', function() {
	    var userId = socket.userId;
	    var activityHash = socket.activityHash;
	    
	    if ( (!activityHash) || (!userId) )
		return;
	    
	    mdb.State.findOne({activityHash: activityHash, user: userId} , function(err, state) {
		if (err || (!state))
		    return;
		
		var data = state.data;
		
		// Send a diff if needed
		var delta = jsondiffpatch.diff(socket.shadow, data);
		
		if (delta !== undefined) {
		    socket.emit('patch', delta, checksumObject( socket.shadow ) );
		    socket.shadow = jsondiffpatch.clone(data);		    
		}
	    });
	});
	
	// Syncing only updates the shadows
	socket.on('sync', function(data) {
	    var userId = socket.userId;
	    var activityHash = socket.activityHash;
	    
	    if ( (!activityHash) || (!userId) )
		return;

	    socket.shadow = data;
	});
	
	socket.on('out-of-sync', function() {
	    var userId = socket.userId;
	    var activityHash = socket.activityHash;
	    
	    if ( (!activityHash) || (!userId) )
		return;
	    
	    socket.emit('sync', socket.shadow);
	});

	socket.on('patch', function(delta, checksum, truth) {
	    var userId = socket.userId;
	    var activityHash = socket.activityHash;
	    
	    if ( (!activityHash) || (!userId) )
		return;

	    // Apply the patch to the shadow
	    if (checksumObject(socket.shadow) != checksum) {
		socket.emit( 'out-of-sync' );
		return;
	    }

	    // Frankly this should never fail
	    try {
		jsondiffpatch.patch(socket.shadow, delta);
	    } catch (e) {
	    }

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
		}
		
		mdb.State.update({activityHash: activityHash, user: userId}, {$set: {data: data}}, {upsert: true}, function (err, affected, raw) {
		    socket.emit('patched', err);
		    
		    // tell other people in the room that we have a differential if they want it
		    socket.broadcast.to(socket.activityRoom).emit('have-differential');
		});
	    });
	});

	socket.on('completion', function(c) {
	    var userId = socket.userId;
	    var activityHash = socket.activityHash;
	    
	    if ( (!activityHash) || (!userId) )
		return;

	    var query = {activityHash: activityHash,
			 user: userId};

	    if (c.activityPath) {
		query = {activityHash: activityHash,
			 activityPath: c.activityPath,
			 repositoryName: c.repositoryName,
			 user: userId};
	    }
	    
	    mdb.Completion.update(query, {$set: {complete: c.complete, date: new Date()}}, {upsert: true}, function (err, affected, raw) {
		// Tell other browsers viewing this user
		socket.broadcast.to(socket.userRoom).emit('completions', [{activityPath: c.activityPath,
									   repositoryName: c.repositoryName,
									   complete: c.complete}]);
	    });
	});
    });
		      
    return exports;
};
