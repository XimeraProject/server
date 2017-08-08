var $ = require('jquery');
var _ = require('underscore');
var Isotope = require('isotope-layout');

var activityCard = require('./activity-card');
var xourseIsotope = undefined;

var updateSearch = function() {
    if (!xourseIsotope) return;
    
    var search = $('#xourse-search').val();

    if ((typeof search === 'undefined') || (search.length == 0)) {
	xourseIsotope.arrange({ filter: '*' });
	return;
    }

    var regexps = _.map( search.toLowerCase().split(" "), function(word) {
	return new RegExp(word);
    });
    
    xourseIsotope.arrange({
	filter: function() {
	    // Bart says do not display these
	    if ($(this).hasClass('part'))
		return false;
	    
	    var text = $(this).text().toLowerCase();
	    
	    return _.all( regexps, function(re) { return re.test( text ); } );
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

