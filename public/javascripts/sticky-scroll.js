define(['jquery', 'bootstrap'], function($) {
    $(document).ready(function() {
	var offset = $("#scroller-anchor").offset();
	
	if (offset) {
	    $('#scroller').affix({
		offset: {
		    top: offset.top;
		}
	    });
	}
    });
});
