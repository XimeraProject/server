define(['jquery', 'underscore', 'jquery-fullsizable'], function($, _) {
    $(function() {
	$('div.image-environment').each( function() {
	    var imageEnvironment = $(this);
	    imageEnvironment.addClass('well well-lg');
	    var link = $('<a>');
	    link.attr('href', $('img', imageEnvironment).attr('src'));

	    link.append( imageEnvironment.children() );
	    imageEnvironment.append( link );
	});

	$('div.image-environment a').fullsizable({
	   // Detaching would look nicer, but MathJax seems to be angry when we detach math elements?
	   // detach_id: "wrap"
	});

    });
    
});
