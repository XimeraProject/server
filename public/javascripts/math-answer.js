define(['jquery', 'underscore', 'popover'], function($, _, popover){
    //var buttonTemplate = _.template( '<label class="btn btn-default <%= correct %>" id="<%= id %>"><input type="radio"><%= content %></input></label>' );
    
    var replaceTemplates = function() {
	$(".mathjax-input").each( function() {
	    var input = $(this);
	    var width = input.width();

	    // Still need to copy over the old attributes!
	    
	    $.get( "/template/math-input", function (data) {
		var result = $(data);
		input.replaceWith( result );
		result.find( "input.form-control" ).width( width - (138 - 85) );

		result.find( ".btn-ximera-submit" ).click( function() {
		    console.log( "Clicked!" );
		    return false;
		});

		popover.bindPopover( result );
	    });
	});
    };

    return {
	replaceTemplates: replaceTemplates
    };
});
