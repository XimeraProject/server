var $ = require('jquery');
var _ = require('underscore');
var async = require('async');
var TinCan = require('./tincan');
var Desmos = require('./desmos');

var libraries = {
    jquery: $,
    underscore: _,
    tincan: TinCan
};

function asynchronousLibrary( dependencies, name, url, object ) {
    return function( callback ) {
	if ((libraries[name] == undefined) && (dependencies.some( function(dependency) { return dependency == name; } ))) {
	    $.getScript( url, function() {
		libraries[name] = window[object];
		callback(null);
	    });
	} else {
	    callback(null);
	}
    };
}

exports.connectInteractives = function() {
    if (window.interactives) {
	window.interactives.forEach( function(interactive) {
	    var dependencies = interactive.dependencies;
	    var code = interactive.callback;
	    
	    var targetId = interactive.targetId;
	    var target = $("#" + targetId);

	    async.series(
		[
		    // Additional asynchronously loaded scripts could be placed here
		    function( callback ) {
			if (dependencies.some( function(dependency) { return dependency == "desmos"; } )) {
			    Desmos.loadAsynchronously();

			    Desmos.onReady( function(Desmos) {
				libraries['desmos'] = Desmos;
				callback(null);
			    });
			} else {
			    callback(null);
			}
		    },

		    asynchronousLibrary( dependencies, "three", "https://cdnjs.cloudflare.com/ajax/libs/three.js/r81/three.min.js", "THREE" ),
		    asynchronousLibrary( dependencies, "jsxgraph", "https://cdnjs.cloudflare.com/ajax/libs/jsxgraph/0.99.5/jsxgraphcore.js", "JXG" ),
		    
		], function(err) {
		    code.apply( target, dependencies.map( function(name) { return libraries[name]; } ) );
		}
	    );
	});
    }
};
