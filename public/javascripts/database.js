/*
  The 'database' provides a mechanism for saving page state to the server.
*/

var $ = require('jquery');
var _ = require('underscore');
var async = require('async');
var io = require('socket.io-client');
var jsondiffpatch = require('jsondiffpatch');


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

module.exports.DATABASE = DATABASE;
    
/****************************************************************/
// At various points in storing page state, we want to refer to the
// activity by its hash
var activityHash = undefined;

var findActivityHash = _.memoize( function( ) {
    return $('main.activity').attr( 'data-activity' );
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


var differentialSynchronization = _.debounce( function( userId ) {
    if (!socket) return;
    
    var delta = jsondiffpatch.diff( SHADOW, DATABASE );
    
    if (delta !== undefined) {
	socket.emit( 'patch', delta, checksumObject(SHADOW) );
	
	SHADOW = jsondiffpatch.clone(DATABASE);
    }

    clickSaveWorkButton();    
}, 1000);

var findRepositoryName = _.memoize( function( element ) {
    if ($(element).hasClass('activity'))
	return $(element).attr( 'data-repository-name' );
    
    return $(element).parents( "[data-activity]" ).attr( 'data-repository-name' );
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
  // $(SAVE_WORK_BUTTON_ID).css('min-width', $(SAVE_WORK_BUTTON_ID).css('width') );
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
	    if (jsondiffpatch(db, originalDatabase) !== undefined) {
		// Trigger a remote update
		module.exports.commit();
		element.trigger( 'ximera:database' );
		differentialSynchronization( null );
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
	    differentialSynchronization( null );
	});
	
	return this;
    }
});

// Upload our local copy (if needed) of the database to the server
module.exports.save = function(callback) {
    // No need to save if we agree with the remote
    if (jsondiffpatch.diff( SHADOW, DATABASE ) === undefined) {
	callback(null);
	return;
    }

    var payload = JSON.stringify( DATABASE );
    
    $.ajax({
	url: '/state/' + activityHash,
	type: 'PUT',
	data: JSON.stringify( DATABASE ),
	contentType: 'application/json',
	success: function( result ) {
	    if (result['ok']) {
		SHADOW = JSON.parse(payload);
		callback(null);
	    } else {
		callback(result);
	    }
	}
    });
};

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
    try {
	socket = io.connect();
    } catch (err) {
	alert( "Could not connect.  Your work is not being saved." );
	socket = { on: function() {}, emit: function() {} };
    }

    socket.emit( 'watch', null, findActivityHash() );

    socket.on( 'initial-sync', function(remoteDatabase) {
	SHADOW = {};
	DATABASE = {};
	
	_.each( remoteDatabase,
		function( database, identifier, list ) {
		    SHADOW[identifier] = jsondiffpatch.clone(database);
		    
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
    });    
    
    socket.on( 'sync', function(remoteDatabase) {
	SHADOW = jsondiffpatch.clone(remoteDatabase);
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

	// differentialSynchronization( userId );
    });
});		

////////////////////////////////////////////////////////////////
// Code for the "save button" is below

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
    
    differentialSynchronization( null );
};

// Animate the process of saving the database to the server
var clickSaveWorkButton = function() {
    $(SAVE_WORK_BUTTON_ID).children('span').not('#work-saving').hide();
    $(SAVE_WORK_BUTTON_ID).children('#work-saving').show();

    saveButtonOnlyGrows();

    module.exports.save(function(err){
	if (err) {
	    throw "Could not save database.";
	}

	$(SAVE_WORK_BUTTON_ID).children('span').not('#work-saved').hide();
	$(SAVE_WORK_BUTTON_ID).children('#work-saved').show();

	saveButtonOnlyGrows();
    });
};

// After the document loads, every 7000 milliseconds, make sure the database is saved.
$(document).ready(function() {
    activityHash = findActivityHash();
    /*
    window.setInterval(function(){
	clickSaveWorkButton();
    }, 7000);
    */
    
    /*
    window.setInterval(function(){
	differentialSynchronization( null, activityHash );	
    }, 500);
    */
    window.onbeforeunload = function() {
	// Before the page disappears, let's test to see if there is unsaved data
	if (jsondiffpatch.diff( SHADOW, DATABASE ) !== undefined) {
	    return "There is unsaved data on this page.";
	}
    };
    
    $(SAVE_WORK_BUTTON_ID).click( clickSaveWorkButton );
    $(RESET_WORK_BUTTON_ID).click( clickResetWorkButton );
});


