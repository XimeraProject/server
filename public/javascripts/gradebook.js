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
    console.log("score =",pointsEarned);
    var payload = {
	pointsEarned: pointsEarned,
	pointsPossible: pointsPossible	
    };

    $.ajax({
	url: '/' + xourseUrl + '/gradebook',
	type: 'PUT',
	data: JSON.stringify(payload),
	contentType: 'application/json',	
	success: function( result ) {
	    console.log( "Recorded gradebook",payload );
	}	    
    });
    
}, 300 );
