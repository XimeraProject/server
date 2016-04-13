var $ = require('jquery');
var _ = require('underscore');
var Isotope = require('isotope-layout');

var activityCard = require('./activity-card');

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

	if (type === 'A') {
	    card = $('<a class="activity-card"></a>');
	    card.attr('data-path', cardData.attr('href') );
	    card.attr('href', cardData.attr('href') );
	    
	    cardData.remove();
	} else
	    card.append( cardData );

	xourse.append(card);
    });

    $('a.activity-card', xourse).activityCard();
    
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

