define(['jquery', 'bootstrap'], function($) {
    $(document).ready(function() {
	$('#scroller').affix({
	    offset: {
		top: $("#scroller-anchor").offset().top
	    }
	});
    });
});
