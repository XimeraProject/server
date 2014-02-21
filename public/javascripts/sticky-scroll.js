define(['jquery', 'bootstrap'], function($) {
    $('#scroller').affix({
	offset: {
	    top: $("#scroller-anchor").offset().top
	}
    });
});
