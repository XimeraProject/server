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

class Building {
    constructor() {
	this.rooms = {};
    }

    join(room, socket) {
	if (this.rooms[room] === undefined)
	    this.rooms[room] = new Set();
	
	this.rooms[room].add( socket );
    }

    broadcast(room, sender, ...parameters) {
	if (this.rooms[room]) {
	    this.rooms[room].forEach( function(socket) {
		if (socket != sender) {
		    socket.sendJSON.apply( socket, parameters );
		}
	    } );
	}
    }
}

var repositoryRooms = new Building();
var userRooms = new Building();
var contextRooms = new Building();
var activityRooms = new Building(); 

exports.push = function(repositoryName) {
    repositoryRooms.broadcast( repositoryName, null, 'push' );
};

var handlers = {};

handlers.wantCommit = function(repositoryName, filename) {
    var socket = this;
    socket.repositoryName = repositoryName;
    
    repositoryRooms.join( repositoryName, socket );
	
    repositories.activitiesFromRecentCommitsOnMaster( repositoryName, filename ).then( function(activities) {
	socket.sendJSON( 'commit', repositoryName, filename, activities[0].sourceSha, activities[0].hash );
    });
};

handlers.supervise = function() {
    var socket = this;    
    var userId = socket.session.guestUserId;
    if (socket.session.passport) {
	userId = socket.session.passport.user || userId;
    }
    
    // Join rooms to watch activities of any of my students
    mdb.LtiBridge.find( {user: new mongo.ObjectID(userId)}, function(err,bridges) {
	if (err) return;
	
	bridges = bridges.filter( function(b) {
	    return (b.roles.some( function(r) {
		return r.match(/Instructor/) || r.match(/TeachingAssistant/);
	    }));
	});
	
	var contexts = unique(bridges.map( function(b) { return b.contextId; } ));
	
	contexts.forEach( function(context) {
	    contextRooms.join( context, socket );
	});	
    });	
};

function toInstructors( socket, message, payload ) {
    var userId = socket.userId;
	
    // And tell any instructors what this student is doing
    mdb.LtiBridge.find( {user: new mongo.ObjectID(userId)}, function(err,bridges) {
	if (err) return;
	
	var contexts = unique(bridges.map( function(b) { return b.contextId; } ));
	
	contexts.forEach( function(context) {
	    contextRooms( context, null, message, payload );
	});	
    });
}

handlers.xake = function(credentials) {
    var socket = this;    
    var repository = credentials.repository;
    var token = credentials.token;

    // Fail silently
    /* BADBAD
    repositories.readRepositoryToken( repository ).then( function(actualToken) {
	if (token == actualToken) {
	    socket.isInstructor = true;
	    socket.join( '/repositories/' + repository + '/instructor' );
	}
    });*/
};

handlers.xakeChat = function( payload ) {
    var socket = this;
    /* BADBAD
    if (socket.isInstructor) {
	console.log( payload );	    
	socket.to('/users/' + payload.userId).sendJSON('chat', "<", payload.message);
    }
*/
};
    
handlers.chat = function(name, message) {
    var socket = this;
    userRooms.broadcast( socket.userId, socket, 'chat', name, message );

    /* BADBAD
    socket.to('/repositories/' + socket.repositoryName + '/instructor')
	.sendJSON('xake-chat', { userId: socket.userId,
			     name: socket.userName,
			     message: message
			   } );	
    */
};

handlers.watch = function(userId, activityHash) {
    var socket = this;

    // BADBAD: Need some security here...
    console.log( "BADBAD: no security checks for " + userId );

    if (userId == null) {
	userId = socket.session.guestUserId;
	if (socket.session.passport) {
	    userId = socket.session.passport.user || userId;
	}
    }
    
    var realUserId = socket.session.guestUserId;
    if (socket.session.passport) {
	realUserId = socket.session.passport.user || realUserId;
    }
    
    mdb.Completion.find({user: userId}, { activityPath: 1, repositoryName: 1, complete: 1 }, function (err, completions) {
	if (!err && completions)
	    socket.sendJSON('completions', completions);
    });
    
    socket.userId = userId;
    userRooms.join( userId, socket );
    
    mdb.User.findOne({_id: realUserId}, { name: 1, imageUrl: 1, email: 1 }, function (err, user) {
	if (!err && user) {
	    toInstructors( socket, 'enter', user);
	    socket.userName = user.name;
	}
    });	
    
    if (!activityHash)
	return;
    
    socket.activityHash = activityHash;
    
    var roomName = `/users/${userId}/state/${activityHash}`;
    socket.activityRoom = roomName;
    activityRooms.join( roomName, socket );
    
    mdb.State.findOne({activityHash: activityHash, user: userId}, function(err, state) {
	if (err || (!state))
	    state = {data: {}};
	socket.shadow = state.data;
	socket.sendJSON('sync', state.data);
    });
};
    
handlers.wantDifferential = function() {
    var socket = this;
    
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
	    socket.sendJSON('patch', delta, checksumObject( socket.shadow ) );
	    socket.shadow = jsondiffpatch.clone(data);		    
	}
    });
};
    
handlers.sync = function(data) {
    var socket = this;    
    var userId = socket.userId;
    var activityHash = socket.activityHash;
	
    if ( (!activityHash) || (!userId) )
	return;
    
    socket.shadow = data;
};
    
handlers.outOfSync = function() {
    var socket = this;        
    var userId = socket.userId;
    var activityHash = socket.activityHash;
	
    if ( (!activityHash) || (!userId) )
	return;
    
    socket.sendJSON('sync', socket.shadow);
};
    
handlers.patch = function(delta, checksum, truth) {
    var socket = this;            
    var userId = socket.userId;
    var activityHash = socket.activityHash;
	
    if ( (!activityHash) || (!userId) )
	return;

    // Apply the patch to the shadow
    if (checksumObject(socket.shadow) != checksum) {
	socket.sendJSON( 'out-of-sync' );
	return;
    }
	
    // Frankly this should never fail
    try {
	jsondiffpatch.patch(socket.shadow, delta);
    } catch (e) {
	winston.error('could not patch a shadow that passed a checksum test');
	winston.error(e);
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
	    socket.sendJSON('patched', err);
	    
	    // tell other people in the room that we have a differential if they want it
	    activityRooms.broadcast( socket.activityRoom, socket, 'have-differential' );
	});
    });
};
    
handlers.completion = function(c) {
    var socket = this;                
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
	var payload = [{activityPath: c.activityPath,
			userId: userId,
			repositoryName: c.repositoryName,
			complete: c.complete}];
	
	// Tell other browsers viewing this user
	userRooms.broadcast( socket.userId, 'completions', payload );
	
	// And tell any instructors what this student is doing
	toInstructors( socket, 'completions', payload);
	
	socket.activityPath = c.activityPath;
	socket.repositoryName = c.repositoryName;
    });
};


/* BADBAD should tell others about disconnection
socket.on('disconnect', function() {
	var realUserId = socket.session.guestUserId;
	
	if (socket.session.passport) {
	    realUserId = socket.session.passport.user || realUserId;
	}

	toInstructors( socket, 'leave', { userId: realUserId, repositoryName: socket.repositoryName, activityPath: socket.activityPath } );
    });
*/


exports.connection = function( socket ) {
    socket.sendJSON = function(...parameters) {
	// BADBAD: should remove from buildings if this happens
	if (socket.readyState == 1) 
	    socket.send( JSON.stringify( parameters ) );
    };
    
    socket.on('message', function(data) {
	var payload = JSON.parse( data );

	if (! Array.isArray(payload)) {
	    winston.error("WebSocket message is not an array.");
	    return;
	}

	if (payload.length == 0) {
	    winston.error("WebSocket message is empty.");
	    return;
	}

	var message = payload[0];
	var camelCased = message.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });

	if (handlers[camelCased]) {
	    handlers[camelCased].apply( socket, payload.slice(1) );
	} else {
	    winston.error( "Do not know how to handle " + message );
	}
    });
};

