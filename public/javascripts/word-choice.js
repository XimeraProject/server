var $ = require('jquery');
var _ = require('underscore');
var MathJax = require('mathjax');
var database = require('./database');
var TinCan = require('./tincan');

var buttonTemplate = _.template( '<label class="btn btn-default <%= correct %>" id="<%= id %>"></label>' );

var oldtemplate = '<form class="form-inline" style="display: inline-block;">' +
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

var template = '<div class="dropdown word-choice">' +
    '<button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
    'Dropdown button' +
    '</button>' +
    '<div class="dropdown-menu" aria-labelledby="dropdownMenuButton">' +
    '<a class="dropdown-item" href="#">Action</a>' +
    '<a class="dropdown-item" href="#">Another action</a>' +
    '<a class="dropdown-item" href="#">Something else here</a>' +
    '</div>' +
    '</div>';

var createWordChoice = function() {
    var wordChoice = $(this);
    
    var id = wordChoice.attr('id');
    var element = $('<div class="dropdown word-choice btn-ximera-submit"><button class="btn btn-primary dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">&mdash;</button></div>');
    var button = $('button', element);
    button.attr('id', id);

    var menu = $('<div class="dropdown-menu" aria-labelledby="' + id + '"></div>');
    element.append(menu);
    
    $('.choice', wordChoice).each( function() {
	var choice = $(this);

	var link = $('<button class="dropdown-item choice" type="button"></button>');
	if (choice.hasClass( "correct" ))
	    link.addClass("correct");
	link.attr( 'id', choice.attr('id') );
	
	link.append( choice.contents() );
	menu.append( link );

	link.click( function() {
	    element.persistentData( 'response', choice.attr('id') );
	    
	    if (link.hasClass("correct")) {
		element.persistentData('correct', true);
	    } else {
		element.persistentData('correct', false);		
	    }

	    element.trigger( 'ximera:attempt' );
	    
	    if (element.persistentData('correct')) {
		element.trigger( 'ximera:correct' );
	    }	    
	
	    TinCan.answer( element, { response: element.persistentData('response'),
				      success: element.persistentData('correct') } );
	    
	});
    });
    
    wordChoice.replaceWith( element );

    element.trigger( 'ximera:answer-needed' );

    element.persistentData( function(event) {
	if (element.persistentData('response')) {
	    var link = element.find( '#' + element.persistentData('response') );
	    button.empty();
	    button.append( link.clone().contents() );
	} else {
	    button.html( '&mdash;' );
	}

	if (element.persistentData('correct')) {
	    element.addClass('btn-ximera-correct');
	    element.removeClass('btn-ximera-incorrect');
	    element.removeClass('btn-ximera-submit');
	    button.addClass('btn-success');
	    button.removeClass('btn-danger');
	    button.removeClass('btn-primary');	    	    	    
	} else {
	    if (element.persistentData('correct') === undefined) {
		element.removeClass('btn-ximera-correct');
		element.removeClass('btn-ximera-incorrect');
		element.addClass('btn-ximera-submit');
		button.removeClass('btn-success');
		button.removeClass('btn-danger');
		button.addClass('btn-primary');	    	    	    
	    } else {
		element.removeClass('btn-ximera-correct');
		element.addClass('btn-ximera-incorrect');
		element.removeClass('btn-ximera-submit');
		button.removeClass('btn-success');
		button.addClass('btn-danger');
		button.removeClass('btn-primary');
	    }
	}
	
	return false;
    });
        
};

$.fn.extend({
    wordChoice: function() {
	return this.each( createWordChoice );
    }
});


