var $ = require('jquery');
var _ = require('underscore');
var Isotope = require('isotope-layout');

var activityCard = require('./activity-card');
var xourseIsotope = undefined;

var updateSearch = function() {
    if (!xourseIsotope) return;
    
    var search = $('#xourse-search').val();    
    console.log("search =", search);

    if ((typeof search === 'undefined') || (search.length == 0)) {
	xourseIsotope.arrange({ filter: '*' });
	return;
    }
	
    xourseIsotope.arrange({
	filter: function() {
	    if ($(this).hasClass('part'))
		return true;
	    
	    var text = $(this).text().toLowerCase();
	    if (text.match( search.toLowerCase() ))
		return true;
	    else
		return false;
	}
    });   
};

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

    xourseIsotope = new Isotope( xourse.get(0),
				 options );
};

// On document ready...
$(function() {
    $('.xourse').each( layoutXourse );

    $('#xourse-search').on('input', function() {
	updateSearch();
    });
});

