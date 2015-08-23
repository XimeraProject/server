define(['jquery', 'underscore', 'mathjax', 'tincan', 'progress-bar', 'database', 'problem', 'math-answer', 'multiple-choice', 'hint', 'free-response', 'shuffle'], function($, shCore, MathJax, TinCan, ProgressBar) {

    var createActivity = function() {
	var activity = $(this);

	activity.fetchData( function(db) {
	    activity.persistentData( function() {
		if (!(activity.persistentData( 'experienced' ))) {
		    TinCan.experience(activity);
		    activity.persistentData( 'experienced', true );
		}
	    });

	    MathJax.Hub.Register.MessageHook( "End Rerender", function(message) {
		console.log( "Rerender: ", message );
		$(".mathjax-input", message[1]).mathAnswer();
	    });

	    var firstTime = true;
	    
	    MathJax.Hub.Register.MessageHook( "End Process", function(message) {
		if (firstTime) {
		    console.log("End Process (!st time)");
		    $(".mathjax-input", activity).mathAnswer();
		    firstTime = false;
		}
	    });
	    
	    $(".problem-environment", activity).problemEnvironment();
	    //$(".mathjax-input", activity).mathAnswer();
	    $(".multiple-choice", activity).multipleChoice();
	    $(".hint", activity).hint();
	    $(".free-response", activity).freeResponse();
	    
	    $(".shuffle", activity).shuffle();

	    ProgressBar.monitorActivity( activity );
	});
    };
    
    $.fn.extend({
	activity: function() {
	    return this.each( createActivity );
	}
    });    

    return;
});
