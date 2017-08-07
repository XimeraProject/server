var $ = require('jquery');
window.jQuery = $;

$(function() {
    $('div.image-environment').each( function() {

	var imageEnvironment = $(this);

	$('img', imageEnvironment).each( function() {
	    var img = $(this);
	    var href = img.attr('src');
	    
	    var link = $('<a>');
	    link.attr('href', href);

	    link.append( img );
	    imageEnvironment.append( link );
	});
    });

});

