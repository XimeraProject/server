var $ = require('jquery');
var _ = require('underscore');
var MathJax = require('mathjax');
var database = require('./database');
var TinCan = require('./tincan');

var buttonTemplate = _.template( '<label class="btn btn-default <%= correct %>" id="<%= id %>"></label>' );

var template = '<form class="form-inline" style="display: inline-block;">' +
	'<span class="input-group">' +
   	'<select class="form-control">' +
	'<option class="blank"></option>' +
	'</select>' +
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

var createWordChoice = function() {
    var wordChoice = $(this);

    var element = $(template);

    wordChoice.find( ".choice" ).each( function() {
	var correct = '';
	if ($(this).hasClass( "correct" ))
	    correct = "correct";
	
	var identifier = $(this).attr('id');
	var label = $(this);

	element.find('select.form-control').append( '<option class="' + correct + '" id="'+ identifier + '">' + label.text() + '</option>' );
    });

    wordChoice.replaceWith( element );
    element.attr('id', wordChoice.attr('id') );
    
    element.trigger( 'ximera:answer-needed' );

    element.persistentData( function(event) {
	if (element.persistentData('response')) {
	    element.find('option').prop( 'selected', false );		    
	    element.find( '#' + element.persistentData('response') ).prop( 'selected', true );
	} else {
	    element.find( 'option' ).prop( 'selected', false );
	    element.find( '.blank' ).prop( 'selected', true );
	    console.log( "bank" );
	}

	if (element.persistentData('correct')) {
	    element.find('.btn-ximera-correct').show();
	    element.find('.btn-ximera-incorrect').hide();
	    element.find('.btn-ximera-submit').hide();
	    
	    element.find('select').prop( 'disabled', true );
	} else {
	    element.find('select').prop( 'disabled', false );		
	    element.find('.btn').hide();

	    if ((element.persistentData('response') == element.persistentData('attempt')) &&
		(element.persistentData('response')))
		element.find('.btn-ximera-incorrect').show();
	    else
		element.find('.btn-ximera-submit').show();
	}

	return false;
    });

    element.find('select').change( function() {
	var selected = element.find('select option:selected');
	element.persistentData( 'response', selected.attr('id') );

	console.log( element.persistentData( 'response' ) );
    });
    
    element.find( ".btn-ximera-correct" ).click( function() {
	return false;
    });

    element.find( ".btn-ximera-incorrect" ).click( function() {
	element.find( ".btn-ximera-submit" ).click();
	return false;
    });
    
    element.find( ".btn-ximera-submit" ).click( function() {
	var selected = element.find('select option:selected');

	element.persistentData( 'correct', selected.hasClass('correct') );
	element.persistentData( 'attempt', selected.attr('id') );

	element.trigger( 'ximera:attempt' );
	
	if (element.persistentData('correct')) {
	    element.trigger( 'ximera:correct' );
	}	    
	
	TinCan.answer( element, { response: element.persistentData('response'),
				  success: element.persistentData('correct') } );
	
	return false;
    });

    
};

$.fn.extend({
    wordChoice: function() {
	return this.each( createWordChoice );
    }
});


