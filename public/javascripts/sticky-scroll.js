var $ = require('jquery');
var bootstrap = require('bootstrap');

$(document).ready(function() {
    var offset = $("#scroller-anchor").offset();
    
    if (offset) {
	$('#scroller').affix({
	    offset: {
		top: offset.top
	    }
	});
    }
});

