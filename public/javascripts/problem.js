var $ = require('jquery');
var _ = require('underscore');
var MathJax = require('./mathjax');
var TinCan = require('./tincan');
var database = require('./database');

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
		problem.persistentData( 'experienced', true );
	    }

	    if (!(problem.persistentData( 'available' ))) {
		if (problem.parents(".problem-environment").length == 0)
		    problem.persistentData( 'available', true );
	    }

	    // You'd think you might want to call MathJax Rerender
	    // to update things when you're messing around with
	    // visibility, but NO!  MathJax seems to be removing
	    // things from the DOM (like our problem divs) and
	    // replacing them with identical copies---except that
	    // our event handlers weren't attached to the copies.
	    // So instead of hiding and showing things, we have to
	    // do this CSS visibility thing, which lets MathJax
	    // size everything appropriately even while it is
	    // hidden,

	    var visible = false;

	    if (problem.persistentData( 'available' ))
		visible = true;

	    var parent = problem.parents(".problem-environment").first();
	    if ( ! (parent.persistentData( 'blocking' )))
		visible = true;
	    
	    if (visible) {
		problem.css({visibility: 'visible', position:'relative'});
		problem.fadeTo('slow', 1);
	    } else {
		problem.css({visibility: 'hidden', position:'absolute'});
		problem.css({opacity: 0});
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

	// Sometimes I end up recreating answers, and when those
	// answers are recreated they again emit
	// ximera:answer-needed, but without the following lines,
	// I would then have extraneous entries in answersNeeded
	// which would be, worse, unanswerable since the are no
	// longer in the DOM.
	
	var inDom = function(e) { return $.contains( document.documentElement, e ); };
	answersNeeded = _.filter( answersNeeded, inDom );

	// mathjax also sticks extra stuff under a "semantics" tag now
	var notSemantic = function(e) { return $(e).closest( 'semantics' ).length == 0; }
	answersNeeded = _.filter( answersNeeded, notSemantic );
	
	problem.data( 'answers-needed', answersNeeded  );
	
	problem.persistentData( 'blocking', true );
	
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
	    
	    // When a problem is complete, we announce it to the world
	    problem.trigger( 'ximera:complete' );

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



