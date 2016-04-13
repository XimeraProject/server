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

    // BADBAD: feedback should vary based on the provided release condition
    problem.on( 'ximera:attempt', function(event) {
	console.log( "FEEDBACK" );

	feedback.persistentData( 'available', true );
    });
}

$.fn.extend({
    feedback: function() {
	return this.each( createFeedback );
    }
});    

