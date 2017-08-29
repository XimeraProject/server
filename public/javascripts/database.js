/*
  The 'database' provides a mechanism for saving page state to the server.
*/

var $ = require('jquery');
var _ = require('underscore');
var async = require('async');
var io = require('socket.io-client');
var jsondiffpatch = require('jsondiffpatch');

var chat = require('./chat');
var users = require('./users');


var CANON = require('canon');
var XXH = require('xxhashjs');
function checksumObject(object) {
    return XXH.h32( CANON.stringify( object ), 0x1337 ).toString(16);
}

var socket = undefined;

var SAVE_WORK_BUTTON_ID = '#save-work-button';
var RESET_WORK_BUTTON_ID = '#reset-work-button';    

var DATABASE = undefined;
var SHADOW = undefined;
var COMPLETIONS = {};
var completionCallbacks = {};

module.exports.DATABASE = DATABASE;

var wantPageUpdates = [];
module.exports.onPageUpdate = function(callback) {
    wantPageUpdates.unshift(callback);
};

/****************************************************************/
// At various points in storing page state, we want to refer to the
// activity by its hash
var activityHash = undefined;

var findActivityHash = _.memoize( function( ) {
    return $('main').attr( 'data-hash' );
});

$.fn.extend({ activityHash: function() {
    return findActivityHash();
}});

var findActivityPath = _.memoize( function( ) {
    return $('main.activity').attr( 'data-path' );
});

$.fn.extend({ activityPath: function() {
    return findActivityPath( this );
}});


function differentialSynchronization() {
    if ((!socket) || (!(socket.connected))) {
	$(SAVE_WORK_BUTTON_ID).children('span').not('#work-saved-error').hide();
	$(SAVE_WORK_BUTTON_ID).children('#work-saved-error').show();
	saveButtonOnlyGrows();    
	
	return;
    }

    var delta = jsondiffpatch.diff( SHADOW, DATABASE );
    
    if (delta !== undefined) {
	$(SAVE_WORK_BUTTON_ID).children('span').not('#work-saving').hide();
	$(SAVE_WORK_BUTTON_ID).children('#work-saving').show();
	saveButtonOnlyGrows();    
	
	socket.emit( 'patch', delta, checksumObject(SHADOW) );
	
	SHADOW = jsondiffpatch.clone(DATABASE);
    }
}

var differentialSynchronizationDebounced = _.debounce( differentialSynchronization, 1000 );

var findRepositoryName = _.memoize( function( element ) {
    if ($(element).hasClass('activity'))
	return $(element).attr( 'data-repository-name' );
    
    return $(element).parents( "[data-hash]" ).attr( 'data-repository-name' );
});

$.fn.extend({ repositoryName: function() {
    return findRepositoryName( this );
}});

// Return the database hash associated to the given element
module.exports.get = function(element) {
    if (DATABASE === undefined) {
	throw "Database not loaded.";
    }
    
    var identifier = $(element).attr('id');
    
    if (!(identifier in DATABASE))
	DATABASE[identifier] = {};
    
    return DATABASE[identifier];
};

function saveButtonOnlyGrows() {
  // This is less important when the save button is on the lefthand side
  $(SAVE_WORK_BUTTON_ID).css('min-width', $(SAVE_WORK_BUTTON_ID).css('width') );
}

// Commit some changes to the database (which will propagate them to other instances)
module.exports.commit = _.throttle( function() {
    // After making a change, the "save work" button should be shown, as opposed to the "work saved!" button
    $(SAVE_WORK_BUTTON_ID).children('span').not('#work-save').hide();
    $(SAVE_WORK_BUTTON_ID).children('#work-save').show();
    saveButtonOnlyGrows();
}, 50 );

// Register a listener to be called whenever the database changes
module.exports.listen = function(element, callback) {
    var identifier = $(element).attr('id');
    
    $(element).on('ximera:database', $(element).database(),
		  function( event ) {
		      return callback.bind(this)(event);
		      
		      // BADBAD: Do I need to return true, so I don't prevent this from bubbling?
		  });
    
    // Because we might register our listener AFTER we download
    // the database for the first time, let's just let our
    // listener know about what's currently in the database
    $(element).trigger( 'ximera:database' );
    
    return;
};

// Call $(element).database() to get the database hash associated
// to the given element
$.fn.extend({
    database: function() {
	var element = $(this);
	var db = module.exports.get(this);
	var originalDatabase = jsondiffpatch.clone(db);
	
	// If we change the database...
	_.defer( function() {
	    if (jsondiffpatch.diff(db, originalDatabase) !== undefined) {
		// Trigger a remote update
		module.exports.commit();
		element.trigger( 'ximera:database' );
		differentialSynchronizationDebounced();
	    }
	});
	
	return module.exports.get(this);
    },
    
    persistentData: function( key, value ) {
	if (typeof key == 'function') {
	    var callback = key;
	    module.exports.listen( this, callback );
	    return this;
	}
	
	if (value === undefined) {
	    return module.exports.get(this)[key];
	}
	
	module.exports.get(this)[key] = value;
	
	var element = this;
	
	// Trigger a remote update
	_.defer( function() {    
	    module.exports.commit();
	    element.trigger( 'ximera:database' );
	    differentialSynchronizationDebounced();
	});
	
	return this;
    }
});

var fetcherCallbacks = [];

// activity.js will use this to download the database from the server
$.fn.extend({ fetchData: function(callback) {
    if (DATABASE !== undefined)
	callback(DATABASE);
    else 
	fetcherCallbacks.unshift( callback );
}});

function synchronizePageWithDatabase() {
    _.each( DATABASE,
	    function( database, identifier, list ) {
		$( "#" + identifier ).trigger( 'ximera:database' );
	    });
}

$(document).ready(function() {
    var activityHash = findActivityHash();
    
    if (!activityHash)
	return;
    
    try {
	socket = io.connect();
    } catch (err) {
	alert( "Could not connect.  Your work is not being saved." );
	socket = { on: function() {}, emit: function() {} };
    }

    var learnerId = $('main').attr( 'data-learner' );
    
    socket.emit( 'watch', learnerId, findActivityHash() );

    var repositoryName = $('main').attr('data-repository-name');
    var filename = $('main').attr('data-path');
    
    socket.emit( 'want-commit', repositoryName, filename );
    socket.on('push', function() {
	socket.emit( 'want-commit', repositoryName, filename );	
    });
    
    socket.on('reconnect', function () { 
	socket.emit( 'watch', null, findActivityHash() );
    });

    socket.on('commit', function (remoteRepositoryName, remoteFilename, commitHash, remoteContentHash) {
	if (remoteContentHash != activityHash) {
	    $('#update-version-button').attr('href', window.location.pathname + "?" + commitHash );
	    $('#pageUpdate').show();
	}
    });

    socket.on( 'sync', function(remoteDatabase) {
	SHADOW = jsondiffpatch.clone(remoteDatabase);

	if (DATABASE === undefined) {
	    DATABASE = {};
	
	    _.each( remoteDatabase,
		    function( database, identifier, list ) {
			// It's possible that, for some reason, I've
			// already made changes to the database, so I
			// just want to merge in the remote
			if (identifier in DATABASE)
			    _.extend( DATABASE[identifier], database );
			else {
			    DATABASE[identifier] = database;
			}
		    });
	    
	    synchronizePageWithDatabase();

	    _.each( fetcherCallbacks, function(callback) {
		callback(DATABASE);
	    });
	}
    });    
    
    socket.on( 'out-of-sync', function() {
	socket.emit( 'sync', SHADOW );
    });

    var wantDifferential = _.debounce( function() {
	socket.emit( 'want-differential' );
    }, 100 );
    
    socket.on( 'have-differential', function() {
	wantDifferential();
    });

    socket.on( 'disconnect', function(err) {
	$(SAVE_WORK_BUTTON_ID).children('span').not('#work-saved-error').hide();
	$(SAVE_WORK_BUTTON_ID).children('#work-saved-error').show();
	saveButtonOnlyGrows();    
    });
    
    socket.on( 'patched', function(err) {
	if (err) {
	    $(SAVE_WORK_BUTTON_ID).children('span').not('#work-saved-error').hide();
	    $(SAVE_WORK_BUTTON_ID).children('#work-saved-error').show();
	    saveButtonOnlyGrows();    
	} else {
	    $(SAVE_WORK_BUTTON_ID).children('span').not('#work-saved').hide();
	    $(SAVE_WORK_BUTTON_ID).children('#work-saved').show();
	    saveButtonOnlyGrows();
	}
    });
    
    socket.on( 'patch', function( delta, checksum ) {
	// Apply patch to the client state...
	jsondiffpatch.patch( DATABASE, delta);

	synchronizePageWithDatabase();	
	
	// Confirm that our shadow now matches their shadow
	if (checksumObject(SHADOW) != checksum) {
	    // We are out of sync, and should request synchronization
	    socket.emit( 'out-of-sync' );
	} else {
	    jsondiffpatch.patch(SHADOW, delta);
	}
    });

    socket.on( 'completions', function(completions) {
	_.each( completions, function(c) {
	    var url = c.repositoryName + '/' + c.activityPath;
	    var changed = false;
	    if (url in COMPLETIONS) {
		if (COMPLETIONS[url] < c.complete) {
		    COMPLETIONS[url] = c.complete;
		    changed = true;
		}
	    } else {
		COMPLETIONS[url] = c.complete;
		changed = true;		
	    }

	    if ((changed) && (completionCallbacks[url])) {
		_.each( completionCallbacks[url], function(callback) {
		    callback(c.complete);
		});
	    }
	});
    });

    //////////////////////////////////////////////////////////////////
    // Chat room functionality
    
    socket.on('chat', function(name, message) {
	chat.appendToTranscript( name, message, true );
    });

    chat.onSendMessage( function(message) {
	var name = users.me().then( function(user) {
	    var first = user.name.split(' ')[0];
	    var last = user.name.split(' ').slice(-1)[0];
	    var initials = '??';
	    if (first && last)
		initials = first.substr(0,1) + last.substr(0,1);
	    
	    socket.emit( 'chat', initials, message );
	});
    });
    
});

module.exports.setCompletion = function(repositoryName, activityPath, complete) {
    if ((!socket) || (!(socket.connected))) return;

    socket.emit( 'completion', {repositoryName: repositoryName, activityPath: activityPath, complete: complete} );
};

module.exports.onCompletion = function(repositoryName, activityPath, callback) {
    var url = repositoryName + '/' + activityPath;
    
    if (!(url in completionCallbacks))
	completionCallbacks[url] = [];

    completionCallbacks[url].unshift(callback);

    if (COMPLETIONS[url]) {
	callback(COMPLETIONS[url]);
    }
};

// No need to confirm with the user to delete work---that happens via a Bootstrap Modal
var clickResetWorkButton = function() {
    var keys = _.keys( DATABASE );

    _.each( keys,
	    function( identifier ) {
		// Want to empty the object but can't throw away the reference
		var hash = DATABASE[identifier];
		for( var i in hash ) {
		    delete hash[i];
		}
	    });

    synchronizePageWithDatabase();
    differentialSynchronization();
};

// After the document loads, every 7000 milliseconds, make sure the database is saved.
$(document).ready(function() {
    activityHash = findActivityHash();
    
    window.onbeforeunload = function() {
	// Before the page disappears, let's test to see if there is unsaved data
	if (jsondiffpatch.diff( SHADOW, DATABASE ) !== undefined) {
	    return "There is unsaved data on this page.";
	}
    };
    
    $(SAVE_WORK_BUTTON_ID).click( differentialSynchronization );
    $(RESET_WORK_BUTTON_ID).click( clickResetWorkButton );
});

