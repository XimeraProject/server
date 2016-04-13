/*
  The 'database' provides a mechanism for saving page state to the server.
*/

var $ = require('jquery');
var _ = require('underscore');
var async = require('async');
var io = require('socket.io-client');

var socket;
    
var SAVE_WORK_BUTTON_ID = '#save-work-button';
var RESET_WORK_BUTTON_ID = '#reset-work-button';    
    
var DATABASES = {};
var REMOTES = {};

module.exports.DATABASES = DATABASES;
    
var reseting = false;
    
var findActivityHash = _.memoize( function( element ) {
    if ($(element).hasClass('activity'))
	return $(element).attr( 'data-activity' );
    
    return $(element).parents( "[data-activity]" ).attr( 'data-activity' );
});

$.fn.extend({ activityHash: function() {
    return findActivityHash( this );
}});

// Return the database hash associated to the given element; the
// element must be under a "data-activity" field.  Data-activity
// combined with the element's ID is used for the key.
module.exports.get = function(element) {
    var activityHash = findActivityHash(element);
    
    if (!(activityHash in DATABASES)) {
	throw "Database not loaded.";
    }
    
    var database = DATABASES[activityHash];	
    var identifier = $(element).attr('id');
    
    if (!(identifier in database))
	database[identifier] = {};
    
    return database[identifier];
};

function saveButtonOnlyGrows() {
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
    var activityHash = findActivityHash(element);
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
	var originalDatabase = JSON.stringify(db);
	
	// If we change the database...
	_.defer( function() {
	    if (JSON.stringify(db) != originalDatabase) {
		// Trigger a remote update
		module.exports.commit();
		element.trigger( 'ximera:database' );
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
	});
	
	socket.emit( 'persistent-data', {
	    activityHash: findActivityHash(this),
	    identifier: $(element).attr('id'),
	    key: key,
	    value: value
	});
	
	return this;
    }
});

// Upload our local copy (if needed) of the database to the server
module.exports.save = function(callback) {
    
    if (reseting)
	return false;
    
    async.each( _.keys(DATABASES),
		function(activityHash, callback) {
		    var json = JSON.stringify(DATABASES[activityHash]);

		    // BADBAD: I do not have to save anything if we agree with the remote -- unless I changed this in another browser!
		    if ((activityHash == "undefined") || (json == REMOTES[activityHash])) {
			callback(null);
		    } else {
			$.ajax({
			    url: '/state/' + activityHash,
			    type: 'PUT',
			    data: json,
			    contentType: 'application/json',
			    success: function( result ) {
				if (result['ok']) {
				    REMOTES[activityHash] = json;
				    callback(null);
				} else {
				    callback(result);
				}
			    },
			});
		    }
		},
		function(err) {
		    callback(err);
		});	
};

// activity.js will use this to download the database from the server
$.fn.extend({ fetchData: function(callback) {
    var activity = $(this);
    var activityHash = activity.attr( 'data-activity' );

    $.ajax({
	url: '/state/' + activityHash + '?' + (new Date().getTime().toString()),
	type: 'GET',
	dataType: 'json',
	success: function( result ) {
	    // I am merge this in with whatever might already be
	    // there, but there SHOULDN'T be anything in there
	    REMOTES[activityHash] = JSON.stringify(result);
	    
	    if (!(activityHash in DATABASES))
		DATABASES[activityHash] = {};
	    
	    _.each( result,
		    function( database, identifier, list ) {
			if (identifier in DATABASES[activityHash])
			    _.extend( DATABASES[activityHash][identifier], database );
			else
			    DATABASES[activityHash][identifier] = database;
		    });
	    
	    socket.emit( 'activity', activityHash );
	    
	    _.each( DATABASES[activityHash],
		    function( database, identifier, list ) {
			$( "#" + identifier, activity ).trigger( 'ximera:database' );
		    });

	    callback( DATABASES[activityHash] );
	},
    });
}});

$(document).ready(function() {
    try {
	socket = io.connect();
    } catch (err) {
	// If we don't have socket.io, just silently fake it
	socket = { on: function() {}, emit: function() {} };
    }
    
    socket.on( 'persistent-data', function(data) {
	var activity = $( "[data-activity=" + data.activityHash + "]" );
	
	if (data.activityHash in DATABASES) {
	    DATABASES[data.activityHash][data.identifier][data.key] = data.value;
	    $( "#" + data.identifier, activity ).trigger( 'ximera:database' );
	}
    });
});		

////////////////////////////////////////////////////////////////
// Code for the "save button" is below

// No need to confirm with the user to delete work---that happens via a Bootstrap Modal
var clickResetWorkButton = function() {
    reseting = true;

    async.each( _.keys(DATABASES),
		function(activityHash, callback) {

		    var keys = _.keys( DATABASES[activityHash] );

		    $.ajax({
			url: '/state/' + activityHash,
			type: 'DELETE',
			dataType: 'json',
			error: function( jqXHR, err, exception ) {
			    callback( err );
			},
			success: function( result ) {
			    if (result['ok']) {
				REMOTES[activityHash] = {};
				
				_.each( keys,
					function( identifier ) {
					    // Want to empty the object but can't throw away the reference
					    var hash = DATABASES[activityHash][identifier];
					    for( var i in hash ) {
						delete hash[i];
					    }
					});

				_.each( keys,
					function( identifier ) {
					    $( "#" + identifier, '[data-activity=' + activityHash + ']' ).trigger( 'ximera:database' );
					});

				callback(null);
				
			    } else {
				callback('error');
			    }
			},
		    });
		},
		function(err) {
		    reseting = false;
		    
		    if (err) {
			alert(err);
		    }
		});	
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
    window.setInterval(function(){
	clickSaveWorkButton();
    }, 1000);

    window.onbeforeunload = function() {
	// Before the page disappears, let's test to see if there is unsaved data
	if (_.some( _.keys(DATABASES), function(hash) { return (JSON.stringify(DATABASES[hash]) != REMOTES[hash]); } )) {
	    return "There is unsaved data on this page.";
	}
    };
    
    $(SAVE_WORK_BUTTON_ID).click( clickSaveWorkButton );
    $(RESET_WORK_BUTTON_ID).click( clickResetWorkButton );
});


