define(['jquery', 'underscore', 'isotope'], function($, _, Isotope) {

    var layoutXourse = function( xourseData ) {
	console.log( xourseData );
	
	var xourse = $('.xourse-contents');

	var cards = $('h1, h2, h3, a.activity', xourseData);

	cards.each( function() {
	    var cardData = $(this);
	    console.log( cardData );
	    
	    var card = $('<div class="activity-card"></div>');

	    var type = cardData.prop('tagName');
	    
	    if (type === 'H1') {
		card = $('<div class="activity-card large-card"></div>');
	    }

	    if (type === 'H2') {
		card = $('<div class="activity-card medium-card"></div>');
	    }	    

	    card.append( cardData );

	    xourse.append(card);
	});

	xourse.show();
	
	var options = {
	    layoutMode: 'fitRows',
	    itemSelector: '.activity-card',
	    filter: '*',
	    animationOptions: {
		duration: 750,
		easing: 'linear',
		queue: false
	    }
	};

	var iso = new Isotope( xourse.get(0),
			       options );
	
    };
    
    // On document ready...
    $(function() {
	$('.xourse-data').each( function() {
	    var xourseData = $(this);
	    layoutXourse( xourseData );
	});
    });
    
    return;
});
