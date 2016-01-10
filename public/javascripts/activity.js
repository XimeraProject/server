define(['jquery', 'underscore', 'mathjax', 'tincan', 'progress-bar', 'activity-card', 'database', 'problem', 'math-answer', 'multiple-choice', 'select-all', 'word-choice', 'hint', 'free-response', 'shuffle', 'feedback'], function($, _, MathJax, TinCan, ProgressBar) {

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
	    $(".feedback", activity).feedback();	    

	    $('a.activity-card').activityCard();
	    
	    ProgressBar.monitorActivity( activity );
	});
    };
    
    $.fn.extend({
	activity: function() {
	    return this.each( createActivity );
	},

	recordCompletion: function(proportionComplete) {
	    var hash = $(this).activityHash();

	    if (hash != undefined) {
		$.ajax({
		    url: '/completion/' + hash,
		    type: 'PUT',
		    data: JSON.stringify({complete: proportionComplete}),
		    contentType: 'application/json',
		    success: function( result ) {
			console.log( "recording completion for " + hash );
		    },
		});
	    }

	    return;
	},
    });    

    return;
});
