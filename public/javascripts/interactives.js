var $ = require('jquery');
var _ = require('underscore');

var libraries = {
    jquery: $,
    underscore: _,
};

exports.connectInteractives = function() {
    window.interactives.forEach( function(interactive) {
	var dependencies = interactive.dependencies;
	var callback = interactive.callback;

	var targetId = interactive.targetId;
	var target = $("#" + targetId);
	
	callback.apply( target, dependencies.map( function(name) { return libraries[name]; } ) );
    });
};
