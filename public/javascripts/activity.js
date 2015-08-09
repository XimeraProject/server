define(['jquery', 'underscore', 'mathjax', 'tincan', 'database', 'problem', 'math-answer', 'multiple-choice', 'hint', 'free-response', 'shuffle'], function($, shCore, MathJax, TinCan) {

    var createActivity = function() {
	var activity = $(this);

	activity.fetchData( function(db) {
	    activity.persistentData( function() {
		if (!(activity.persistentData( 'experienced' ))) {
		    TinCan.experience(activity);
		    activity.persistentData( 'experienced', true );
		}
	    });
	    
	    var firstTime = true;	    
	    
	    MathJax.Hub.Register.MessageHook( "End Process", function(message) {
		if (firstTime) {
		    $(".mathjax-input").mathAnswer();
		    firstTime = false;
		}
	    });
	    
	    $(".problem-environment", activity).problemEnvironment();
	    $(".mathjax-input", activity).mathAnswer();
	    $(".multiple-choice", activity).multipleChoice();
	    $(".hint", activity).hint();
	    $(".free-response", activity).freeResponse();
	    
	    $(".shuffle", activity).shuffle();
	});
    };
    
    $.fn.extend({
	activity: function() {
	    return this.each( createActivity );
	}
    });    

    return;
});
