var $ = require('jquery');

$(document).ready(function() {
    // Refresh to bust cache
    if (window.location.search.match(/^\?/)) {
	if ((window.history) && (window.history.pushState)) {
	    window.history.pushState( {}, document.title, window.location.pathname );
	    window.location.reload(true);
	}
    }
});

