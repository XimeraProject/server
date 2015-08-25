define(['jquery', 'underscore', 'mathjax', 'tincan', 'progress-bar', 'database', 'problem', 'math-answer', 'multiple-choice', 'select-all', 'word-choice', 'hint', 'free-response', 'shuffle'], function($, _, MathJax, TinCan, ProgressBar) {

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
		    console.log("End Process (1st time)");
		    $(".mathjax-input", activity).mathAnswer();
		    firstTime = false;
		}
	    });
	    
	    $(".problem-environment", activity).problemEnvironment();
	    $(".mathjax-input", activity).mathAnswer();	    
	    $(".multiple-choice", activity).multipleChoice();
	    $(".select-all", activity).selectAll();
	    $(".word-choice", activity).wordChoice();
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
