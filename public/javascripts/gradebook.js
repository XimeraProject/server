var $ = require('jquery');
var _ = require('underscore');

exports.update = _.debounce( function() {
    var pointsEarned = 0;
    
    $(".activity-card").each( function() {
	var card = $(this);
	var weight = parseFloat(card.attr('data-weight'));
	var completion = parseFloat(card.attr('data-max-completion'));

	if (! isNaN(weight)) {
	    if (! isNaN(completion)) {	    
		var points = weight * completion;
		pointsEarned = pointsEarned + points;
	    }
	}
    });

    var pointsPossible = $("main").attr( 'data-points' );
    var xourseUrl = $("main").attr( 'data-xourse-url' );

    var payload = {
	pointsEarned: pointsEarned,
	pointsPossible: pointsPossible	
    };

    $(".progress.completion-meter").attr('title', 'Submitting grade...' );
    
    $.ajax({
	url: '/' + xourseUrl + '/gradebook',
	type: 'PUT',
	data: JSON.stringify(payload),
	contentType: 'application/json',	
	success: function( result ) {
	    console.log( "Recorded gradebook",payload );
	    $('.progress-bar', ".progress.completion-meter").removeClass( 'bg-danger' );
	    $('.progress-bar', ".progress.completion-meter").addClass( 'bg-success' );
	    $(".progress.completion-meter").attr('title', 'Grade submitted at '  + (new Date()).toLocaleTimeString() );
	},
	error: function(jqXHR, err, exception) {
	    $(".progress.completion-meter").attr('title', 'Could not submit grade.' );
	    $('.progress-bar', ".progress.completion-meter").removeClass( 'bg-success' );
	    $('.progress-bar', ".progress.completion-meter").addClass( 'bg-danger' );
	    window.setTimeout( exports.update, 1000 );
	}
    });
    
}, 300 );
