var $ = require('jquery');
var _ = require('underscore');
var database = require('./database');

var answerHtml = '<div class="btn-group" style="vertical-align: center;">' +
	'<button  type="button" class="btn btn-success btn-ximera-correct" data-toggle="tooltip" data-placement="top" title="Correct answer!" style="display: none">' +
	'<i class="fa fa-check"/>&nbsp;Correct' +
	'</button></div>' +
	'<div class="btn-group" style="vertical-align: center;">' +
	'<button  type="button" class="btn btn-danger btn-ximera-incorrect" data-toggle="tooltip" data-placement="top" title="Incorrect.  Try again!" style="display: none">' +
	'<i class="fa fa-times"/>&nbsp;Try again' +
	'</button></div>' +
	'<div class="btn-group" style="vertical-align: center;">' +
	'<button  type="button" class="btn btn-primary btn-ximera-submit" data-toggle="tooltip" data-placement="top" title="Click to check your answer.">' +
	'<i class="fa fa-question"/>&nbsp;Check work' +
	'</button>' +
	'</div>';

var createValidator = function() {
    var validator = $(this);
    
    $(validator).append( $(answerHtml) );

    validator.trigger( 'ximera:answer-needed' );

    validator.on( 'ximera:answers-changed', function() {
	// BADBAD: disable check work button

	// Mark it as "incorrect" if all the responses match the last attempt
	var good = true;
	validator.find('.mathjaxed-input').each( function(i,e) {
	    if (($(e).persistentData('response')) && ($(e).persistentData( 'attempt' ) != $(e).persistentData('response'))) {
		good = false;
	    }
	});
	validator.persistentData( 'incorrect', good );
    });
        
    validator.persistentData(function(event) {
	if (validator.persistentData('correct')) {
	    validator.find( '.btn-group button' ).hide();
	    validator.find( '.btn-group .btn-ximera-correct' ).show();
	} else {
	    validator.find('.btn-ximera-correct').hide();
	    validator.find('.btn-ximera-incorrect').hide();
	    validator.find('.btn-ximera-submit').hide();

	    if (validator.persistentData('incorrect'))
		validator.find('.btn-ximera-incorrect').show();
	    else	    
		validator.find('.btn-ximera-submit').show();
	}
    });

    var checkAnswer = function() {
	// BADBAD: this should check whether validation is possible -- i.e., does the validator code throw an error?
	// this should acatually validate
	try {
	    var correct = window[validator.attr('id')]();
	    validator.persistentData('correct', correct );
	} catch(err) {
	    console.log(err);
	    validator.persistentData('correct', false );
	};
	
	validator.trigger( 'ximera:attempt' );
	
	validator.find('.mathjaxed-input').each( function(i,e) {
	    $(e).persistentData( 'attempt', $(e).persistentData('response') );
	    $(e).persistentData( 'correct', validator.persistentData('correct') );
	});
	
	if (validator.persistentData('correct')) {
	    validator.trigger( 'ximera:correct' );
	}
	
	validator.trigger( 'ximera:answers-changed' );

	return false;
    };
    
    $(validator).find( ".btn-ximera-submit" ).click( checkAnswer );
    $(validator).find( ".btn-ximera-incorrect" ).click( checkAnswer );
};

$.fn.extend({
    validator: function() {
	return this.each( createValidator );
    }
});
