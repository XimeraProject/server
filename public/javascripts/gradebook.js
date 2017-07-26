var $ = require('jquery');
var _ = require('underscore');

exports.update = _.debounce( function() {
    var pointsEarned = 0;
    
    $("a.activity-card").each( function() {
	var card = $(this);
	var weight = card.attr('data-weight');
	var completion = card.attr('data-max-completion');

	var points = weight * completion;

	pointsEarned = pointsEarned + points;
    });

    var pointsPossible = $(".course-navigation").attr( 'data-points' );

    var xourseUrl = $(".course-navigation").attr( 'data-xourse-url' );    

    var payload = {
	pointsEarned: pointsEarned,
	pointsPossible: pointsPossible	
    };

    $.ajax({
	url: '/' + xourseUrl + '/gradebook',
	type: 'PUT',
	data: JSON.stringify(payload),	
	success: function( result ) {
	    console.log( "Recorded gradebook",payload );
	}	    
    });
    
}, 300 );
