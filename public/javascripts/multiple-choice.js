define(['jquery', 'underscore'], function($, _){
    var buttonTemplate = _.template( '<label class="btn btn-default <%= correct %>" id="<%= id %>"><input type="radio"><%= content %></input></label>' );
    
    var replaceTemplates = function() {
	$(".multiple-choice").each( function() {
	    $(this).html( '<div class="btn-group-vertical" role="group" data-toggle="buttons">' + 
			  $(this).html() +
			  '</div>' );

	    $(this).find( ".choice" ).each( function() {
		var correct = '';
		if ($(this).hasClass( "correct" ))
		    correct = "correct";

		var button = $(this).replaceWith( buttonTemplate({ id: $(this).attr('id'), correct: correct, content: $(this).html() }) );
	    });

	    $(this).find( "label" ).each( function() {	    
		$(this).click( function() {
		    console.log( "clicked " + $(this).attr('id') );
		    // This will bubble up the DOM to a problem-environment
		    $(this).trigger( "ximera:guess" );
		});
	    });
	});
    };

    return {
	replaceTemplates: replaceTemplates
    };
});
