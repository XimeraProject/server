define(['jquery', 'underscore', 'mathjax', 'database', 'tincan'], function($, _, MathJax, database, TinCan){

    var hintButtonHtml = '<button class="btn btn-info btn-reveal-hint" type="button" data-toggle="tooltip" data-placement="top" title="Reveal the next hint."><i class="fa fa-life-ring"/>&nbsp; Reveal Hint<span class="counter" style="display: none;"> (<span class="count">1</span>)</span></button>';

    var rejax = function() {
	MathJax.Hub.Queue(["Rerender", MathJax.Hub]);
    };
    
    var createProblem = function() {
	var problem = $(this);

	if (!problem.hasClass("hint")) {
	    problem.persistentData( function(event) {
		if (problem.persistentData( 'available' ) && !(problem.persistentData( 'experienced' ))) {
		    TinCan.experience(problem);
		    MathJax.Hub.Queue(["Rerender", MathJax.Hub, problem]);
		    problem.persistentData( 'experienced', true );
		}

		if (!(problem.persistentData( 'available' ))) {
		    if (problem.parents(".problem-environment").length == 0)
			problem.persistentData( 'available', true );
		}
		
		if ((problem.parents(".problem-environment").length == 0) || (problem.persistentData( 'available' ))) {
		    // This could be animated?  {duration: 'fast', complete: rejax});
		    problem.show();
		} else {
		    problem.hide();
		}

		return false;
	    });
	}

	// Elements that will block problem completion until answered
	// should emit a "ximera:answer-needed" so we record this
	problem.on( 'ximera:answer-needed', function(event) {
	    var answersNeeded = [];
	    if (problem.data( 'answers-needed' ))
		answersNeeded = problem.data( 'answers-needed' );
	    
	    answersNeeded.unshift( event.target );
	    problem.data( 'answers-needed', answersNeeded  );
	    
	    return false;
	});

	var hintButton = $(hintButtonHtml);
	
	problem.on( 'ximera:register-hint', function(event) {
	    // Hints /are/ problems, but they shouldn't provide their own hints
	    if ($(event.target).is(problem))
		return true;
	    
	    var hints = [];
	    
	    if (problem.data( 'hints' ))
		hints = problem.data( 'hints' );
	    
	    hints.push( event.target );
	    problem.data( 'hints', hints  );
	    
	    if (hints.length == 1) {
		hintButton.click( function(event) {
		    var nextHint = _.first( _.filter( hints, function(element) { return ! $(element).persistentData('available'); } ) );
		    $(nextHint).persistentData('available', true );
		    $(nextHint).persistentData('collapsed', false );
		});
		
		problem.prepend( hintButton );
	    } else {
		hintButton.find( ".count" ).html( hints.length );
	    }
	    
	    return false;
	});

	// When an answer is correct, it should emit "ximera:correct"
	// after setting its 'correct' data to true.
	problem.on( 'ximera:correct', function(event) {
	    if (_.every(problem.data('answers-needed'), function(answer) {
		return $(answer).persistentData('correct');
	    })) {
		if (!(problem.persistentData( 'complete')))
		    TinCan.completeProblem(problem);
		
		problem.persistentData( 'complete', true );
		
		// Uncover the next level of problem-environments
		problem.find('.problem-environment').not('.hint').each( function() {
		    if ($(this).parent('.problem-environment').first().is(problem)) {
			$(this).persistentData( 'available', true );
		    }
		});
	    }

	    return false;
	});
    };

    $.fn.extend({
	problemEnvironment: function() {
	    return this.each( createProblem );
	}
    });    

    return;
});
