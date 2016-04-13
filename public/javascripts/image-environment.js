var $ = require('jquery');
window.jQuery = $;
var fullsizeable = require('jquery-fullsizable');

$(function() {
    $('div.image-environment').each( function() {

	var imageEnvironment = $(this);
	imageEnvironment.addClass('well well-lg');

	$('img', imageEnvironment).each( function() {
	    var img = $(this);
	    var href = img.attr('src');
	    
	    var link = $('<a>');
	    link.attr('href', href);

	    link.append( img );
	    imageEnvironment.append( link );
	});
    });

    $('div.image-environment a').fullsizable({
	// Detaching would look nicer, but MathJax seems to be angry when we detach math elements?
	// detach_id: "wrap"
    });

});

