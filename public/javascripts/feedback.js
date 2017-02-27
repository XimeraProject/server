var $ = require('jquery');
var _ = require('underscore');
var database = require('./database');

var createFeedback = function() {
    var feedback = $(this);

    feedback.persistentData( function() {
	if (feedback.persistentData( 'available' )) {
	    feedback.css({visibility: 'visible', position:'relative'});
	    feedback.fadeTo('slow', 1);
	} else {
	    feedback.css({visibility: 'hidden', position:'absolute'});
	    feedback.css({opacity: 0});
	}
    });

    var problem = feedback.parents( ".problem-environment" ).first();

    if (feedback.attr('data-feedback') == 'attempt') {
	problem.on( 'ximera:attempt', function(event) {
	    feedback.persistentData( 'available', true );
	});
    }

    if (feedback.attr('data-feedback') == 'correct') {
	problem.on( 'ximera:correct', function(event) {
	    feedback.persistentData( 'available', true );
	});
    }

    if (feedback.attr('data-feedback') == 'script') {
	problem.on( 'ximera:attempt', function(event) {
	    var release = false;
	    try {
		release = window[feedback.attr('id')]();
	    } catch(err) {
		release = false;
	    }

	    feedback.persistentData( 'available', release );
	});
	
	console.log( feedback );
    }
    
};

$.fn.extend({
    feedback: function() {
	return this.each( createFeedback );
    }
});    

