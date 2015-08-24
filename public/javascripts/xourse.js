define(['jquery', 'underscore'], function($, _) {

    var layoutXourse = function( xourse ) {

	//console.log( $(':header', xourse ) );

	$('.partHead .titlemark', xourse).hide();

	$('h1', xourse).each( function() {
	    var rule = $( '<hr/>' );
	    rule.insertBefore( $(this) );
	});

	$('a.activity', xourse).each( function() {
	    var href = $(this).attr('href').replace( /\.tex$/, '' );
	    
	    var activityTemplate = _.template( '<a href="<%= href %>">Activity</a>' );
	    
	    $(this).replaceWith( $( activityTemplate( { href: href } ) ) );
	});	
	
	xourse.show();
    };
    
    // On document ready...
    $(function() {
	$('.xourse-contents').each( function() {
	    var xourse = $(this);
	    layoutXourse( xourse );
	});
    });
    
    return;
});
