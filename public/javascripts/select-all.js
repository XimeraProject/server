// BADBAD: This code is unfortunately a minor tweak of multiple-choice.  The similar code should be shared somehow.

var $ = require('jquery');
var _ = require('underscore');
var MathJax = require('mathjax');
var database = require('./database');
var TinCan = require('./tincan');


var buttonTemplate = _.template( '<label class="btn btn-default <%= correct %>" id="<%= id %>"></label>' );

var answerHtml = '<div class="btn-group" style="vertical-align: bottom; ">' +
	'<button class="btn btn-success btn-ximera-correct" data-toggle="tooltip" data-placement="top" title="Correct answer!" style="display: none">' +
	'<i class="fa fa-check"/>&nbsp;Correct' +
	'</button></div>' +
	'<div class="btn-group" style="vertical-align: bottom; ">' +
	'<button class="btn btn-danger btn-ximera-incorrect" data-toggle="tooltip" data-placement="top" title="Incorrect.  Try again!" style="display: none">' +
	'<i class="fa fa-times"/>&nbsp;Try again' +
	'</button></div>' +
	'<div class="btn-group" style="vertical-align: bottom; ">' +
	'<button class="btn btn-primary btn-ximera-submit" data-toggle="tooltip" data-placement="top" title="Click to check your answer.">' +
	'<i class="fa fa-question"/>&nbsp;Check work' +
	'</button>' +
	'</div>';

var createSelectAll = function() {
    var selectAll = $(this);

    selectAll.wrapInner( '<div class="ximera-horizontal"><div class="btn-group-vertical" role="group" data-toggle="buttons" style="padding-right: 1em;"></div></div>' );
    
    $('.ximera-horizontal', selectAll).append( $(answerHtml) );

    selectAll.find( ".choice" ).each( function() {
	var correct = '';
	if ($(this).hasClass( "correct" ))
	    correct = "correct";
	
	var identifier = $(this).attr('id');
	var label = $(this);

	label.wrap( buttonTemplate({ id: identifier, correct: correct }) );
	
	// Major change from multiple-choice
	label.prepend( '<input type="checkbox"></input>' );
    });

    selectAll.trigger( 'ximera:answer-needed' );
    
    selectAll.persistentData(function(event) {
	selectAll.find( 'label').removeClass('active');
	
	if (selectAll.persistentData('chosen')) {
	    selectAll.persistentData('chosen').forEach( function(id) {
		console.log( id );
		selectAll.find( '#' + id ).addClass('active');
	    });
	    
	    selectAll.find( '.btn-group button' ).removeClass('disabled');
	    selectAll.find( '.btn-group .btn-ximera-submit' ).addClass('pulsate');
	} else {
	    selectAll.find( '.btn-group button' ).addClass('disabled');
	    selectAll.find( '.btn-group .btn-ximera-submit' ).removeClass('pulsate');		
	}

	if (selectAll.persistentData('correct')) {
	    selectAll.find( '.btn-group button' ).hide();
	    selectAll.find( '.btn-group .btn-ximera-correct' ).show();
	    
	    selectAll.find( 'label' ).not( '.correct' ).addClass( 'disabled' );
	    selectAll.find( 'label .correct' ).removeClass('disabled');
	} else {
	    selectAll.find( 'label' ).removeClass( 'disabled' );
	    
	    selectAll.find( '.btn-group button' ).hide();

	    if (selectAll.persistentData('checked') &&
		(_.isEqual( _.sortBy( selectAll.persistentData('checked') ),
			    _.sortBy( selectAll.persistentData('chosen')))))
		selectAll.find( '.btn-group .btn-ximera-incorrect' ).show();
	    else {
		selectAll.find( '.btn-group .btn-ximera-submit' ).show();
		selectAll.find( '.btn-group .btn-ximera-submit' ).show();		    
	    }
	}

	selectAll.find( '.btn-ximera-submit' ).prop( 'disabled', ! selectAll.find( 'label' ).hasClass( 'active' ) );
	selectAll.find( '.btn-ximera-incorrect' ).prop( 'disabled', ! selectAll.find( 'label' ).hasClass( 'active' ) );
    });

    var checkAnswer = function() {
	if (selectAll.persistentData('chosen')) {
	    selectAll.persistentData('checked', selectAll.persistentData('chosen') );

	    var chosen = selectAll.persistentData('chosen');

	    var correct = true;
	    selectAll.find('label').each( function() {
		var id = $(this).attr('id');
		
		if ($(this).hasClass('correct') !== _.contains( chosen, id ))
		    correct = false;
	    });
	    
	    selectAll.persistentData('correct', correct );

	    selectAll.trigger( 'ximera:attempt' );
	    
	    if (selectAll.persistentData('correct')) {
		selectAll.trigger( 'ximera:correct' );
	    }

	    TinCan.answer( selectAll, { response: selectAll.persistentData('chosen'),
					success: selectAll.persistentData('correct') } );
	}
    };
    
    $(this).find( ".btn-ximera-submit" ).click( checkAnswer );
    $(this).find( ".btn-ximera-incorrect" ).click( checkAnswer );
    
    $(this).find( "label" ).each( function() {
	$(this).click( function() {
	    if (selectAll.persistentData('correct'))
		return false;
	    
	    var id = $(this).attr('id');
	    var chosen = selectAll.persistentData('chosen');

	    if (!chosen)
		chosen = [];
	    
	    if (_.contains(chosen, id))
		selectAll.persistentData('chosen', _.difference( chosen, [id] ) );
	    else
		selectAll.persistentData('chosen', _.union( chosen, [id] ) );

	    console.log( selectAll.persistentData('chosen' ) );

	    return false;	    
	});
    });
    
};

$.fn.extend({
    selectAll: function() {
	return this.each( createSelectAll );
    }
});



