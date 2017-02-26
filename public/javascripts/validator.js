var $ = require('jquery');
var _ = require('underscore');
var database = require('./database');

var answerHtml = '<div class="pull-right btn-group" style="vertical-align: top;">' +
	'<button class="btn btn-success btn-ximera-correct" data-toggle="tooltip" data-placement="top" title="Correct answer!" style="display: none">' +
	'<i class="fa fa-check"/>&nbsp;Correct' +
	'</button></div>' +
	'<div class="pull-right btn-group" style="vertical-align: top;">' +
	'<button class="btn btn-danger btn-ximera-incorrect" data-toggle="tooltip" data-placement="top" title="Incorrect.  Try again!" style="display: none">' +
	'<i class="fa fa-times"/>&nbsp;Try again' +
	'</button></div>' +
	'<div class="pull-right btn-group" style="vertical-align: top;">' +
	'<button class="btn btn-primary btn-ximera-submit" data-toggle="tooltip" data-placement="top" title="Click to check your answer.">' +
	'<i class="fa fa-question"/>&nbsp;Check work' +
	'</button>' +
	'</div>';

var createValidator = function() {
    var validator = $(this);
    
    $(validator).append( $(answerHtml) );

    validator.trigger( 'ximera:answer-needed' );
    
    validator.persistentData(function(event) {
	if (validator.persistentData('correct')) {
	    validator.find( '.btn-group button' ).hide();
	    validator.find( '.btn-group .btn-ximera-correct' ).show();
	} else {
	    validator.find( '.btn-group button' ).hide();
	    validator.find( '.btn-group .btn-ximera-submit' ).show();
	}

	// this should disable subanswers
	//validator.find( '.btn-ximera-submit' ).prop( 'disabled', ! validator.find( 'label' ).hasClass( 'active' ) );
	//validator.find( '.btn-ximera-incorrect' ).prop( 'disabled', ! validator.find( 'label' ).hasClass( 'active' ) );
    });

    var checkAnswer = function() {
	// BADBAD: this should check whether validation is possible -- i.e., does the validator code throw an error?
	if (true) {
	    validator.persistentData('checked', validator.persistentData('chosen') );

	    // this should acatually validate
	    try {
		console.log("validating via",window[validator.attr('id')] );
		var correct = window[validator.attr('id')]();
		console.log("correct =",correct);
		validator.persistentData('correct', correct );
	    } catch(err) {
		console.log(err);
		validator.persistentData('correct', false );		
	    };
	    
	    validator.trigger( 'ximera:attempt' );
	    
	    if (validator.persistentData('correct')) {
		validator.trigger( 'ximera:correct' );
	    }
	}
    };
    
    $(validator).find( ".btn-ximera-submit" ).click( checkAnswer );
    $(validator).find( ".btn-ximera-incorrect" ).click( checkAnswer );
};

$.fn.extend({
    validator: function() {
	return this.each( createValidator );
    }
});
