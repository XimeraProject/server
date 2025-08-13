var $ = require('jquery');
var MathJax = require('./mathjax');

// var ddebug = window.debug || require('debug');
var ddebug = require('debug');
var debug = ddebug('references')

debug("references.js loaded");

function zoomTo( id ) {
	var extraOffset	= 0;
	var target = $(document.getElementById(id));
	if (target.length > 0) {
 	 console.log('Target found:', target);
	} else {
  	console.log('No element found with id:', id);
	}

	// var target = document.getElementById(id);
	// if (!target) {
	// 	debug("zoomTo: no element with id " + id);
	// 	return;
	// }

	var previousElement = target.prev()

	if(previousElement && previousElement.prop("tagName") && previousElement.prop("tagName").toLowerCase() == "a" ){
		debug('zoomTo: previous element is an anchor: skip that');
		previousElement = previousElement.prev();
	}

	// debug("zoomTo: "+ id + " previousElement is " + previousElement.prop("tagName").toLowerCase() + " with id " + previousElement.attr('id') + " and class " + previousElement.attr('class'));

	if(previousElement.hasClass('caption')){
		target = previousElement;
		var previousElement = target.prev();
		if(previousElement.prop("tagName").toLowerCase() == "img" && previousElement.parent().prop("tagName").toLowerCase() == "div") {
			target = previousElement.parent();
		}
		
	}
	else if (previousElement.hasClass('mathjax-env')) {
		debug("zoomTo: previousElement is a mathjax-env, so zooming to that");
		extraOffset = 200;
		target = previousElement;
	}
	else {
		debug("zoomTo closest div/dl/dd");
		target = target.closest( 'div, dl, dd' );
	}

	debug("zoomTo: target is now " + target.prop("tagName").toLowerCase() + " with id " + target.attr('id') + " and class " + target.attr('class'));

    // Make the div flash
    target.addClass("flash");
    window.setTimeout( function(){
        target.removeClass("flash");
    }, 5000);
	
     var el = target; 
    var elOffset = el.offset().top;
    debug( "elOffset = " + elOffset );
    var elHeight = el.outerHeight();
    var windowHeight = $(window).height();
    debug( "windowHeight = " + windowHeight );
    var offset;
	
    if (elHeight < windowHeight) {
		offset = elOffset - ((windowHeight / 2) - (elHeight / 2));
    }
    else {
		offset = elOffset;
    }
	
	debug( "Scroll to top + " + offset + " + " + extraOffset);
	
	// offset = offset + extraOffset;



    // $('.main-activity').animate({
	// 	scrollTop: $('.main-activity').scrollTop() + offset 
    // }, 1000);

	window.scrollTo({ top: $('.main-activity').scrollTop() + offset , behavior: 'smooth' });

}

var maximumNumber = 1;
var problemNumber = 1;

var createLabel = function() {
    var label = $(this);
	var href = label.attr('id');
	var referenceText = $('[href="#'+ href + '"').first().text()

    function addLabel(reference) {
	if ( ! (href in MathJax.Extension["TeX/AMSmath"].labels)) {
	    var tag = undefined;

		// debug("href (label.id) "+ href + ": " + "#" + referenceText)
		/*if (href !== "#" + referenceText){
			tag = referenceText
		}
		else{*/
			var enumerated = label.closest( 'dd.enumerate-enumitem' );
			if (enumerated.length > 0) {
				tag = $.trim( enumerated.prev('dt').text() );
				debug("Adding tag " + tag + " for ref '" + href + "' from enumerated")
			} else {
				var previousElement = label.prev();
				if (previousElement.hasClass("caption")) {
					tag = referenceText
					debug("Adding tag " + tag + " for ref '" + href + "' from caption referenceText (ie, first child)")
				} else {
					var problem = label.closest('.problem-environment');
					if (problem.is('[numbered]')){
						tag = problem.attr('numbered')
						debug("Adding tag " + tag + " for ref '" + href + "' from numbered problem")
					}
					else if (problem.hasClass('problem')) {
						tag = problemNumber.toString();
						problemNumber = problemNumber + 1;
						debug("Adding tag " + tag + " for ref '" + href + "' from next problem")

					} else {
						tag = maximumNumber.toString();
						debug("Adding tag " + tag + " for ref '" + href + "' from next other")
						maximumNumber = maximumNumber + 1;
					}	   
				}  
			}
		//}
	    MathJax.Extension["TeX/AMSmath"].labels[href] = { id: href, tag: tag };
	    // debug("Added tag '" + tag + "' for ref '" + href + "'")
	}
    }

    MathJax.Hub.Queue(
	[addLabel]
    );

};

var createReference = function() {
    var reference = $(this);

	console.log("DEBUG: createReference " + reference.text());     // debug ...

    function checkLabel(reference) {
	var href = reference.attr('href');
	console.log("DEBUG: checklabel " + reference.text());     // debug ...
	href = href.replace(/^#/, '' );	
	if (MathJax.Extension["TeX/AMSmath"].labels[href]) {
	    var label = MathJax.Extension["TeX/AMSmath"].labels[href];
	    if (reference.hasClass('reference-keeptext')) {
	        console.log(href + " " + "#" + reference.text() + " not replacing");     // debug ...
		} else {
			console.log(href + " " + "#" + reference.text() + " replacing by " + label.tag);  //debug ...
			reference.text(label.tag);

	    }
	    reference.attr('href', '#' + label.id);
	    reference.addClass('mathjax-link');
	}
    }
    
    MathJax.Hub.Queue(
	[checkLabel,reference]
    );
    
    reference.click( function(event) {

	console.log("DEBUG: click " + reference.text());     // debug ...



	if (reference.hasClass('broken'))
	    return false;
	
	var href = reference.attr('href');

	href = href.replace(/^#/, '' );

	if (reference.hasClass('mathjax-link')) {
		debug("zoomTo (mathjax-link) " + href);
		event.preventDefault(); // prevents the browser from scrolling
		zoomTo( href );
		debug("zoomed to " + href);
	    return;
	}
	
	var repository = $("#theActivity").attr('data-repository-name');

	if (!repository) {
	    console.log( "References must be on a page with #theActivity" );
	    return false;
	}

	$.ajax({
		url: window.toValidPath("/labels/" + repository + "/" + href),
	}).done(function(filename) {
	    // BADBAD: test if I'm on the curent page
	    if (filename == $("#theActivity").attr('data-path')) {
		zoomTo( href );
	    } else {
		var xourse = "";
		if ($("#theActivity").attr('data-xourse-path'))
		    xourse = "/" + $("#theActivity").attr('data-xourse-path');
			window.location.href = window.toValidPath("/" + repository + xourse + "/" + filename + "#" + href);
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

MathJax.Hub.Queue(function () {
  var links = document.querySelectorAll('.MathJax a[href^="#mjx-eqn-"]');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function (event) {
      event.preventDefault();

      var rawHref = this.getAttribute('href'); // e.g., "#mjx-eqn-xeq%3A2.3.8"
      var targetId = decodeURIComponent(rawHref.substring(1)); // remove '#' and decode

      console.log('Intercepted MathJax ref to: ' + targetId);

      var target = document.getElementById(targetId);
      if (target) {
        // target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		console.log('Zooming to MathJax target: ' + targetId);
		zoomTo(targetId);
      } else {
        console.warn('Target not found: ' + targetId);
      }
    });
  }
});


exports.highlightTarget = function() {
    if (targetHash) {
	debug("Will highlight "+ targetHash)
	window.setTimeout( function() {
	    zoomTo( targetHash.replace( /^#/, '' ) );
	}, 1000);
    }
};
