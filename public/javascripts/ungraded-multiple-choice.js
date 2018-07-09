var $ = require('jquery');
var _ = require('underscore');
var MathJax = require('mathjax');
var database = require('./database');
var TinCan = require('./tincan');
var Javascript = require('./javascript');

var buttonTemplate = _.template( '<button class="text-left btn btn-secondary <%= correct %>" id="<%= id %>"></button>' );

var answerHtml = '<div class="btn-group" style="vertical-align: bottom; " aria-live="assertive">' +
	'<div class="btn-group" style="vertical-align: bottom; ">' +
	'<button class="btn btn-primary btn-ximera-unsubmitted" data-toggle="tooltip" data-placement="top" title="Click to submit your answer.">' +
	'<i class="fa fa-envelope-open"/>&nbsp;Submit your work' +
	'</button>' +
	'<div class="btn-group" style="vertical-align: bottom; ">' +
	'<button class="btn btn-primary btn-ximera-submitted" data-toggle="tooltip" data-placement="top" title="Thank you for submitting your answer.">' +
	'<i class="fa fa-envelope"/>&nbsp;Submitted' +
	'</button>' +
	'</div>';


function assignGlobalVariable( noFeedbackMultipleChoice, choice ) {
    if (noFeedbackMultipleChoice.attr('data-id')) {
	if ($(choice).attr('data-value')) {
	    if (window[noFeedbackMultipleChoice.attr('data-id')] != $(choice).attr('data-value')) {
		window[noFeedbackMultipleChoice.attr('data-id')] = $(choice).attr('data-value');
		Javascript.reevaluate(noFeedbackMultipleChoice);
	    }
	}
    }
}


var createNoFeedbackMultipleChoice = function() {
    var noFeedbackMultipleChoice = $(this);

    noFeedbackMultipleChoice.wrapInner( '<div class="ximera-horizontal"><div class="btn-group-vertical" role="group" data-toggle="buttons" style="padding-right: 1em;"></div></div>' );
    $('.ximera-horizontal', noFeedbackMultipleChoice).append( $(answerHtml) );

    noFeedbackMultipleChoice.find( ".choice" ).each( function() {
	var correct = '';
	if ($(this).hasClass( "correct" ))
	    correct = "correct";
	
	var identifier = $(this).attr('id');
	$(this).removeAttr('id');

	var value = $(this).attr('data-value');
	var label = $(this);

	label.wrap( buttonTemplate({ id: identifier, correct: correct }) );
	label.prepend( '<input type="radio"></input>' );

	if (value) {
	    label.closest('button').attr('data-value', value );
	}
    });

    noFeedbackMultipleChoice.trigger( 'ximera:answer-needed' );

    // Display statistics for this problem
    noFeedbackMultipleChoice.on( 'ximera:statistics:answers', function(event, answers) {
	var total = Object.keys( answers ).map( function(x) { return answers[x]; } ).reduce(function(a, b) { return a + b; });
	
	Object.keys( answers ).forEach( function(choice) {
	    var fraction = answers[choice] * 100.0 / total;
	    var element = noFeedbackMultipleChoice.find( '#' + choice );
	    element.css('background', 'linear-gradient(90deg, rgba(0,0,255,0.1) ' + fraction + '%, rgba(0,0,0,0) ' + fraction + '%)' );
	    
	    element.attr('data-toggle', 'tooltip');
	    element.attr('title', answers[choice].toString() +' of ' + total.toString() + ' learners chose this response.' );
	    $(element).tooltip();
	});
    });	
    
    noFeedbackMultipleChoice.persistentData(function(event) {
	noFeedbackMultipleChoice.find( 'button').removeClass('active');
	noFeedbackMultipleChoice.find( '#' + noFeedbackMultipleChoice.persistentData('chosen') ).find( 'input' ).attr( 'aria-checked', false );
	
	if (noFeedbackMultipleChoice.persistentData('chosen')) {
	    noFeedbackMultipleChoice.find( '#' + noFeedbackMultipleChoice.persistentData('chosen') ).addClass('active');
	    noFeedbackMultipleChoice.find( '#' + noFeedbackMultipleChoice.persistentData('chosen') ).find( 'input' ).attr( 'aria-checked', true );
	    noFeedbackMultipleChoice.find( '.btn-group button' ).removeClass('disabled');
	    noFeedbackMultipleChoice.find( '.btn-group .btn-ximera-unsubmitted' ).addClass('pulsate');

	    var choice = noFeedbackMultipleChoice.find( '#' + noFeedbackMultipleChoice.persistentData('chosen') );
	    assignGlobalVariable( noFeedbackMultipleChoice, choice );
	} else {
	    noFeedbackMultipleChoice.find( '.btn-group button' ).addClass('disabled');
	    noFeedbackMultipleChoice.find( '.btn-group .btn-ximera-unsubmitted' ).removeClass('pulsate');		
	}

	if (noFeedbackMultipleChoice.persistentData('correct')) {
	    noFeedbackMultipleChoice.find( '.btn-group button' ).hide();
	    noFeedbackMultipleChoice.find( '.btn-group .btn-ximera-submitted' ).show();
	    
	    noFeedbackMultipleChoice.find( 'button' ).not( '.correct' ).addClass( 'disabled' );
	    noFeedbackMultipleChoice.find( 'button .correct' ).removeClass('disabled');
	} else {
	    noFeedbackMultipleChoice.find( 'button' ).removeClass( 'disabled' );
	    
	    noFeedbackMultipleChoice.find( 'button' ).filter( function() {
		var wrongAnswers = noFeedbackMultipleChoice.persistentData('wrong');
		
		return wrongAnswers && (wrongAnswers[$(this).attr('id')]);
	    }).addClass( 'disabled' );	
	    
	    noFeedbackMultipleChoice.find( '.btn-group button' ).hide();

	    if ((noFeedbackMultipleChoice.persistentData('checked') === noFeedbackMultipleChoice.persistentData('chosen')) &&
		(noFeedbackMultipleChoice.persistentData('chosen') !== undefined))
		noFeedbackMultipleChoice.find( '.btn-group .btn-ximera.submitted' ).show();
	    else {
		noFeedbackMultipleChoice.find( '.btn-group .btn-ximera-unsubmitted' ).show();
		noFeedbackMultipleChoice.find( '.btn-group .btn-ximera-unsubmitted' ).show();		    
	    }
	}

	noFeedbackMultipleChoice.find( '.btn-ximera-unsubmitted' ).prop( 'disabled', ! noFeedbackMultipleChoice.find( 'button' ).hasClass( 'active' ) );
	noFeedbackMultipleChoice.find( '.btn-ximera-submitted' ).prop( 'disabled', ! noFeedbackMultipleChoice.find( 'button' ).hasClass( 'active' ) );
    });

    var checkAnswer = function() {
	if (noFeedbackMultipleChoice.persistentData('chosen')) {
	    noFeedbackMultipleChoice.persistentData('checked', noFeedbackMultipleChoice.persistentData('chosen') );
	    
	    noFeedbackMultipleChoice.persistentData('correct',
					  noFeedbackMultipleChoice.find('#' + noFeedbackMultipleChoice.persistentData('chosen')).hasClass( 'correct' ) );

	    noFeedbackMultipleChoice.trigger( 'ximera:attempt' );
	    
	    if (noFeedbackMultipleChoice.persistentData('correct')) {
		noFeedbackMultipleChoice.trigger( 'ximera:correct' );
	    } else {
		var wrongAnswers = noFeedbackMultipleChoice.persistentData('wrong');
		
		if (!wrongAnswers)
		    wrongAnswers = {};
		
		wrongAnswers[noFeedbackMultipleChoice.persistentData('chosen')] = true;
		noFeedbackMultipleChoice.persistentData('wrong', wrongAnswers);
	    }

	    TinCan.answer( noFeedbackMultipleChoice, { response: noFeedbackMultipleChoice.persistentData('chosen'),
					     success: noFeedbackMultipleChoice.persistentData('correct') } );
	}
    };
    
    $(this).find( ".btn-ximera-unsubmitted" ).click( checkAnswer );
    $(this).find( ".btn-ximera-submitted" ).click( checkAnswer );
    
    $(this).find( "button" ).each( function() {
	var id = $(this).attr('id');
	$(this).click( function() {
	    if (($(this).hasClass('disabled'))) {
		return false;
	    }
	    noFeedbackMultipleChoice.persistentData('chosen', id);
	    assignGlobalVariable( noFeedbackMultipleChoice, $(this) );
	});

	$(this).find( "input" ).each( function() {
	    $(this).change( function() {
		if ($(this).prop('checked')) {
		    noFeedbackMultipleChoice.persistentData('chosen', id);
		    assignGlobalVariable( noFeedbackMultipleChoice, $(this) );
		}
	    });
	});
    });

};

$.fn.extend({
    noFeedbackMultipleChoice: function() {
	return this.each( createNoFeedbackMultipleChoice );
    }
});

