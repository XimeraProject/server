var $ = require('jquery');

function zoomTo( id ) {
    var target = $(document.getElementById(id));
    target = target.closest( 'div' );

    // Make the div flash
    target.stop().css("background-color", "#FFFF9C")
	.animate({ backgroundColor: "#FFFFFF"}, 5000);

    // This is pretty hacky -- I am depending on my scroller-anchor to compute the actual offset
    var el = target; 
    var elOffset = el.offset().top - $('#scroller-anchor').offset().top;
    console.log( "elOffset = " + elOffset );
    var elHeight = el.outerHeight();
    var windowHeight = $(window).height();
    console.log( "windowHeight = " + windowHeight );
    var offset;

    if (elHeight < windowHeight) {
	offset = elOffset - ((windowHeight / 2) - (elHeight / 2));
    }
    else {
	offset = elOffset;
    }

    $('html, body').animate({
	scrollTop: offset
    }, 1000);
}

var createReference = function() {
    var reference = $(this);

    reference.click( function(event) {
	if (reference.hasClass('broken'))
	    return false;
	
	var href = reference.attr('href');

	href = href.replace(/^#/, '' );

	var repository = $("#theActivity").attr('data-repository-name');

	if (!repository) {
	    console.log( "References must be on a page with #theActivity" );
	    return false;
	}

	$.ajax({
	    url: "/labels/" + repository + "/" + href,
	}).done(function(filename) {
	    // BADBAD: test if I'm on the curent page
	    if (filename == $("#theActivity").attr('data-path')) {
		zoomTo( href );
	    } else {
		var xourse = "";
		if ($("#theActivity").attr('data-xourse-path'))
		    xourse = "/" + $("#theActivity").attr('data-xourse-path');
		window.location.href = "/" + repository + xourse + "/" + filename + "#" + href;
	    }
	}).fail( function(xhr, status, err) {
	    reference.prepend( $('<i class="fa fa-unlink"></i><span>&nbsp;</span>') );
	    reference.css( 'background-color', 'red' ); // animate this?
	    reference.css( 'color', 'white' );
	    reference.css( 'cursor', 'not-allowed' );
	    reference.addClass( 'broken' );
	});
	
	return false;
    });

    reference.css( 'cursor', 'pointer' );
};

$.fn.extend({
    reference: function() {
	return this.each( createReference );
    }
});


var targetHash = window.location.hash;

// remove hash
if (window.location.hash) {
    if ((history) && (history.pushState)) {
	// Get rid of hash
	history.pushState("", document.title, window.location.pathname
			  + window.location.search);
    }
}

exports.highlightTarget = function() {
    if (targetHash) {
	window.setTimeout( function() {
	    zoomTo( targetHash.replace( /^#/, '' ) );
	}, 1000);
    }
};
