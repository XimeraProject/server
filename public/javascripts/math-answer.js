define(['jquery', 'underscore', 'popover', 'math-expressions', 'tincan', 'database'], function($, _, popover, Expression, TinCan){

    var template = '<form class="form-inline mathjaxed-input" style="display: inline-block;">' +
	'<span class="input-group">' +
   	  '<input class="form-control" type="text"/>' +
	  '<span class="input-group-btn">' +
	    '<button class="btn btn-success btn-ximera-correct" data-toggle="tooltip" data-placement="top" title="Correct answer!" style="display: none">' +
	      '<i class="fa fa-fw fa-check"/>' +
	    '</button>' +
	    '<button class="btn btn-danger btn-ximera-incorrect" data-toggle="tooltip" data-placement="top" title="Incorrect.  Try again!" style="display: none">' +
	      '<i class="fa fa-fw fa-times"/>' +
	    '</button>' +
	    '<button class="btn btn-primary btn-ximera-submit" data-toggle="tooltip" data-placement="top" title="Click to check your answer.">' +
	      '<i class="fa fa-fw fa-question"/>' +
	    '</button>' +
	  '</span>' +
	'</span>' +
	'</form>';
    
    var createMathAnswer = function() {
	var input = $(this);
	var width = input.width();

	var result = $(template);
	
	// Copy over the old attributes!
	_.each( input, function(element) {
	    _.each( element.attributes, function(a) {
		if (a.name.match( /^data-/ )) {
		    result.attr( a.name, a.value );
		}
	    });
	});
	
	input.replaceWith( result );
	result.find( "input.form-control" ).width( width - (138 - 70) );
	
	// Number the answer boxes in order
	var count = result.parents( ".problem-environment" ).attr( "data-answer-count" );
	if (typeof count === typeof undefined || count === false)
	    count = 0;
	
	result.parents( ".problem-environment" ).attr( "data-answer-count", parseInt(count) + 1 );
	var problem = result.parents( ".problem-environment" ).first();
	var problemIdentifier = result.parents( ".problem-environment" ).attr( "id" );

	// Store the answer index as an id
	result.attr('id', "answer" + count + problemIdentifier);
	
	// When the box changes, update the database
	var inputBox = result.find( "input.form-control" );
	inputBox.on( 'input', function() {
	    var text = $(this).val();
	    result.persistentData( 'response', text );
	});

	// Tell whoever is above us that we need an answer to proceed
	result.trigger( 'ximera:answer-needed' );
	
	// When the database changes, update the box
	result.persistentData( function(event) {
	    if (result.persistentData('response')) {
		if ($(inputBox).val() != result.persistentData('response'))
		    $(inputBox).val( result.persistentData('response'));
	    } else {
		$(inputBox).val( '' );
	    }

	    if (result.persistentData('correct')) {
		result.find('.btn-ximera-correct').show();
		result.find('.btn-ximera-incorrect').hide();
		result.find('.btn-ximera-submit').hide();
		
		inputBox.prop( 'disabled', true );
	    } else {
		inputBox.prop( 'disabled', false );
		result.find('.btn').hide();

		if ((result.persistentData('response') == result.persistentData('attempt')) &&
		    (result.persistentData('response')))
		    result.find('.btn-ximera-incorrect').show();
		else
		    result.find('.btn-ximera-submit').show();
	    }
	    
	});

	result.find( ".btn-ximera-correct" ).click( function() {
	    return false;
	});

	result.find( ".btn-ximera-incorrect" ).click( function() {
	    result.find( ".btn-ximera-submit" ).click();
	    return false;
	});
	
	result.find( ".btn-ximera-submit" ).click( function() {
	    var correctAnswerText = result.attr('data-answer');
	    var correctAnswer;
	    
	    correctAnswer = Expression.fromText(correctAnswerText);

	    var studentAnswer;
	    
	    try {
		var studentAnswerText = inputBox.val();
		studentAnswer = Expression.fromText( studentAnswerText );
	    } catch (err) {
		studentAnswer = Expression.fromText( "sqrt(-1)" );
	    }
	    
	    var tolerance = result.attr('data-tolerance');
	    
	    if (tolerance) {
		tolerance = parseFloat(tolerance);

		var correctAnswerFloat = correctAnswer.evaluate({});
		var studentAnswerFloat = studentAnswer.evaluate({});

		result.persistentData( 'correct',
				       (Math.abs(correctAnswerFloat - studentAnswerFloat) <= tolerance) );
		result.persistentData( 'attempt', inputBox.val() );

		if (result.persistentData( 'correct' ))
		    result.trigger( 'ximera:correct' );
	    } else {
		if (studentAnswer.equals( correctAnswer )) {
		    result.persistentData( 'correct', true );
		    result.trigger( 'ximera:correct' );
		} else {
		    result.persistentData( 'correct', false );
		    result.persistentData( 'attempt', inputBox.val() );
		}
	    }

	    TinCan.answer( result, { response: result.persistentData('response'),
				     success: result.persistentData('correct') } );
	    
	    return false;
	});

	inputBox.keyup(function(event) {
	    if (event.keyCode == 13) {
		result.find( ".btn-ximera-submit" ).click();
	    }
	});
	
	popover.bindPopover( result );
    };

    $.fn.extend({
	mathAnswer: function() {
	    return this.each( createMathAnswer );
	}
    });    

    return;
});
