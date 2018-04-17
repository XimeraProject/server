var $ = require('jquery');

// Check to see if there is a newer version available
var version = require('../../package.json').version;
console.log("This is XIMERA, Version " + version );

$(function() {
    // Check which version the server is providing, avoiding the cache
    $.ajax( "/version?" + (new Date().getTime()) )
	.done(function(data) {
	    // If the server can offer a newer version, let's update
	    if (data != version) {
		// This SHOULD force a reload
		window.location.reload(true);		
	    }
	});
});
