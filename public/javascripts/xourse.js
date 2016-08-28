var $ = require('jquery');
var _ = require('underscore');
var Isotope = require('isotope-layout');

var activityCard = require('./activity-card');

var layoutXourse = function( ) {
    var xourse = $(this);

    $('.activity-card', xourse).activityCard();
    
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
    $('.xourse').each( layoutXourse );
});

