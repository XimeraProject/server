var $ = require('jquery');
var MathJax = require('./mathjax');

function zoomTo( id ) {
    var target = $(document.getElementById(id));
    target = target.closest( 'div, dl' );

    // Make the div flash
    target.addClass("flash");
    window.setTimeout( function(){
        target.removeClass("flash");
    }, 5000);

    // This is pretty hacky
    var el = target; 
    var elOffset = el.offset().top;
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

var maximumNumber = 1;
var problemNumber = 1;

var createLabel = function() {
    var label = $(this);
    var href = label.attr('id');

    function addLabel(reference) {
	if ( ! (href in MathJax.Extension["TeX/AMSmath"].labels)) {
	    var tag = undefined;
	    
	    var enumerated = label.closest( 'dd.enumerate-enumitem' );
	    if (enumerated.length > 0) {
		tag = $.trim( enumerated.prev('dt').text() );
	    } else {
		var problem = label.closest('.problem-environment');
		if (problem.hasClass('problem')) {
		    tag = problemNumber.toString();
		    problemNumber = problemNumber + 1;
		} else {
		    tag = maximumNumber.toString();
		    maximumNumber = maximumNumber + 1;
		}

		problem.attr('numbered', ' ' + tag);		    
	    }
	    
	    MathJax.Extension["TeX/AMSmath"].labels[href] = { id: href, tag: tag };
	}
    }

    MathJax.Hub.Queue(
	[addLabel]
    );

};

var createReference = function() {
    var reference = $(this);

    function checkLabel(reference) {
	var href = reference.attr('href');
	href = href.replace(/^#/, '' );	
	if (MathJax.Extension["TeX/AMSmath"].labels[href]) {
	    var label = MathJax.Extension["TeX/AMSmath"].labels[href];
	    reference.text( label.tag );
	    reference.attr('href', '#' + label.id );
	    reference.addClass('mathjax-link');
	}
    }
    
    MathJax.Hub.Queue(
	[checkLabel,reference]
    );
    
    reference.click( function(event) {
	if (reference.hasClass('broken'))
	    return false;
	
	var href = reference.attr('href');

	href = href.replace(/^#/, '' );

	if (reference.hasClass('mathjax-link')) {
	    zoomTo( href );
	    return;
	}
	
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
    },

    texLabel: function() {
	return this.each( createLabel );
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
