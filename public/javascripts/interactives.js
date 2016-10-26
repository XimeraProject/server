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

// Connected to 'db'
function createProxiedPersistentDataObject( element ) {
    var handler = {
	get: function(target, prop, receiver) {
	    return element.persistentData( prop );
	},
	set: function(target, prop, value, receiver) {
	    element.persistentData( prop, value );
	    return true;
	}
    };
    
    var p = new Proxy(function(callback) {
	element.persistentData(callback);
    }, handler);

    return p;
}

// Connected to 'reset'
function createResetButton( element ) {
    var button = $('<button class="btn btn-danger" type="button"><i class="fa fa-eraser"></i>Reset</button>');
    button.insertAfter( element );

    return function( callback ) {
	$(button).click( callback );
    };
}

// TODO reset button
// TODO checkwork
// TODO includeinteractive needs to be access the parameters that it is passed
// basically as an "parameters" object
function parseParameters(parameters) {
    var pairs = parameters.split(',').map( function(x) { return x.trim(); } );
    var hash = {};
    pairs.forEach( function(pair) {
	var left = pair.split('=')[0];
	var right = pair.split('=')[1];

	hash[left] = right;
    });

    return hash;
}

exports.connectInteractives = function() {
    if (window.interactives) {
	window.interactives.forEach( function(interactive) {
	    var dependencies = interactive.dependencies;
	    var code = interactive.callback;
	    var parameters = interactive.parameters;	    
	    
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
		    asynchronousLibrary( dependencies, "numeric", "http://numericjs.com/numeric/lib/numeric-1.2.6.min.js", "numeric" ),
		    
		], function(err) {
		    code.apply( target, dependencies.map( function(name) {
			if (name == 'db')
			    return createProxiedPersistentDataObject(target);
			else if (name == 'reset')
			    return createResetButton(target);
			else if (name == 'parameters')
			    return parseParameters(parameters);
			else
			    return libraries[name]; } ) );
		}
	    );
	});
    }
};
