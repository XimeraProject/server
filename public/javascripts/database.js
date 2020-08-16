/*
  The 'database' provides a mechanism for saving page state to the server.
*/

var $ = require('jquery');
var _ = require('underscore');
var async = require('async');
var jsondiffpatch = require('jsondiffpatch');
var uuidv4 = require('uuid').v4;

var users = require('./users');

var CANON = require('canon');
var XXH = require('xxhashjs');
function checksumObject(object) {
    return XXH.h32( CANON.stringify( object ), 0x1337 ).toString(16);
}

var DIFFSYNC_DEBOUNCE = 1009; // milliseconds to wait to save

var SAVE_WORK_BUTTON_ID = '#save-work-button';
var RESET_WORK_BUTTON_ID = '#reset-work-button';    

function saveButtonOnlyGrows() {
  // This is less important when the save button is on the lefthand side
  $(SAVE_WORK_BUTTON_ID).css('min-width', $(SAVE_WORK_BUTTON_ID).css('width') );
}

function saveWorkStatus(status, tooltip) {
    $(SAVE_WORK_BUTTON_ID).children('span').not('#work-' + status).hide();
    $(SAVE_WORK_BUTTON_ID).children('#work-' + status).show();
    saveButtonOnlyGrows();
    
    if (tooltip) {
	$(SAVE_WORK_BUTTON_ID).attr( 'title', tooltip );
    } else {	
	$(SAVE_WORK_BUTTON_ID).attr( 'title', '' );
    }
}

module.exports.onPageUpdate = function(callback) {
    console.log("warning: called onPageUpdate() in database.js"); 
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

var findRepositoryName = _.memoize( function( element ) {
    if ($(element).hasClass('activity'))
	return $(element).attr( 'data-repository-name' );
    
    return $(element).parents( "[data-hash]" ).attr( 'data-repository-name' );
});

$.fn.extend({ repositoryName: function() {
    return findRepositoryName( this );
}});

////////////////////////////////////////////////////////////////
// completion code

var COMPLETIONS = {};
var completionCallbacks = {};

module.exports.setCompletion = function(repositoryName, activityPath, complete) {
    var url = repositoryName + '/' + activityPath;
    
    $.ajax({
	url: '/completions/' + url,
	type: 'PUT',
	data: JSON.stringify({complete: complete}),
	contentType: 'application/json',	
	success: function( result ) {
            COMPLETIONS[url] = complete;
            
            _.each( completionCallbacks[url], function(callback) {
		callback(COMPLETIONS[url]);
	    });
	},
	error: function(jqXHR, err, exception) {
            saveWorkStatus( 'error', "Could not save progress bar" );
	}
    });
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


function fetchCompletions() {
    $.ajax({
	url: '/completions',
	type: 'GET',
	contentType: 'application/json',	
	success: function( completions ) {
            console.log(completions);
            
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
	},
	error: function(jqXHR, err, exception) {
            saveWorkStatus( 'error', "Could not read progress bars" );
	}
    });
}


////////////////////////////////////////////////////////////////
//



////////////////////////////////////////////////////////////////
// actual database code
var DATABASE = undefined;
var SHADOW = undefined;
var uuid = uuidv4();

function fetchDatabase() {
    var activityHash = findActivityHash();

    $.ajax({
	url: '/state/' + activityHash + '/' + uuid,
	type: 'GET',
	contentType: 'application/json',	
	success: function( remoteDatabase ) {
	    SHADOW = jsondiffpatch.clone(remoteDatabase);
	    saveWorkStatus( 'saved', 'Shadow synchronized at ' + (new Date()).toLocaleTimeString() );

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
	},
	error: function(jqXHR, err, exception) {
            saveWorkStatus( 'error', "Could not read database" );
	}
    });
}

// BADBAD
function differentialSynchronization() {
    var delta = jsondiffpatch.diff( SHADOW, DATABASE );
    
    if (delta !== undefined) {
	saveWorkStatus( 'saving' );

        var activityHash = findActivityHash();

        $.ajax({
	    url: '/state/' + activityHash + '/' + uuid,
	    type: 'PATCH',
	    contentType: 'application/json',
            headers: {
                'Ximera-Shadow-Checksum': checksumObject(SHADOW),
            },
            data: JSON.stringify(delta),
	    success: function(serverDelta, textStatus, xhr) {
                if (xhr.status === 200) {
                    // Apply patch to the client state...
	            jsondiffpatch.patch( DATABASE, serverDelta );
                    
	            var checksum = xhr.getResponseHeader("Ximera-Shadow-Checksum");
                    
	            synchronizePageWithDatabase();	
	
	            // Confirm that our shadow now matches their shadow
	            if (checksumObject(SHADOW) != checksum) {
	                //  We are out of sync, and should request synchronization
                        $.ajax({
	                    url: '/state/' + activityHash + '/' + uuid,
	                    type: 'GET',
	                    contentType: 'application/json',	
	                    success: function( remoteDatabase ) {
	                        SHADOW = jsondiffpatch.clone(remoteDatabase);
                                saveWorkStatus( 'saved', 'Resynchronized at ' + (new Date()).toLocaleTimeString() );
                            }
                        });
	            } else {
	                jsondiffpatch.patch(SHADOW, serverDelta);
                        SHADOW = jsondiffpatch.clone(DATABASE);
                        saveWorkStatus( 'saved', 'Patched at ' + (new Date()).toLocaleTimeString() );
	            }
                } else {
	            SHADOW = jsondiffpatch.clone(DATABASE);
                    saveWorkStatus( 'saved', 'Synchronized at ' + (new Date()).toLocaleTimeString() );
                }
	    },
	    error: function(xhr, err, exception) {
                if (xhr.status === 422) {
                    saveWorkStatus( 'saving', "Downloading shadow..." );

                    //  We are out of sync, and should request synchronization
                    $.ajax({
	                url: '/state/' + activityHash + '/' + uuid,
	                type: 'GET',
	                contentType: 'application/json',	
	                success: function( remoteDatabase ) {
	                    SHADOW = jsondiffpatch.clone(remoteDatabase);

                            differentialSynchronizationDebounced();   
                        }
                    });
                } else {
                    saveWorkStatus( 'error', "Could not synchronize database" );
                }
	    }
        });
    }
}

var differentialSynchronizationDebounced = _.debounce( differentialSynchronization, DIFFSYNC_DEBOUNCE );

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


////////////////////////////////////////////////////////////////
// get commit

function fetchCommit() {
    var repositoryName = $('main').attr('data-repository-name');
    var filename = $('main').attr('data-path');
    var activityHash = findActivityHash();
    
    var url = repositoryName + '/' + filename;
    
    $.ajax({
	url: '/commits/' + url,
	type: 'GET',
	contentType: 'application/json',	
	success: function( result ) {
            var remoteContentHash = result.hash;
            
	    if (remoteContentHash != activityHash) {
	        $('#update-version-button').attr('href', window.location.pathname + "?" + result.sourceSha );
	        $('#pageUpdate').show();
	    }
	},
	error: function(jqXHR, err, exception) {
            saveWorkStatus( 'error', "Could not read commit hash" );
	}
    });

}

////////////////////////////////////////////////////////////////
// setup

function connectToServer() {
    fetchCompletions();
    fetchCommit();
    fetchDatabase();
}

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

module.exports.resetWork = clickResetWorkButton;

window.addEventListener('online', connectToServer );
			
window.addEventListener('offline', function () {
    saveWorkStatus( 'error', "No internet available" );
});

// After the document loads, every few seconds, make sure the database is saved.
$(document).ready(function() {
    activityHash = findActivityHash();

    if (!activityHash) {
        console.log("warning: no activity hash found by database.js");
	return;
    }
    
    saveWorkStatus( 'error', "Connecting..." );
    connectToServer();
    
    window.onbeforeunload = function() {
	// Before the page disappears, let's test to see if there is unsaved data
	if (jsondiffpatch.diff( SHADOW, DATABASE ) !== undefined) {
	    return "There is unsaved data on this page.";
	}
    };
    
    $(SAVE_WORK_BUTTON_ID).click( differentialSynchronization );
    $(RESET_WORK_BUTTON_ID).click( clickResetWorkButton );
});

