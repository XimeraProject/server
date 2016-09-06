var $ = require('jquery');
var _ = require('underscore');
var MathJax = require('./mathjax');
var TinCan = require('./tincan');
var database = require('./database');
var Expression = require('math-expressions');
var ProgressBar = require('./progress-bar');
var popover = require('./popover');

var template = '<form class="form-inline mathjaxed-input" style="display: inline-block;">' +
	'<span class="input-group">' +
   	'<input class="form-control" type="text"/>' +
	'<span class="input-group-btn">' +
	'<button class="btn btn-success btn-ximera-correct" data-toggle="tooltip" data-placement="top" title="Correct answer!" style="display: none; z-index: 1;">' +
	'<i class="fa fa-fw fa-check"/>' +
	'</button>' +
	'<button class="btn btn-danger btn-ximera-incorrect" data-toggle="tooltip" data-placement="top" title="Incorrect.  Try again!" style="display: none; z-index: 1;">' +
	'<i class="fa fa-fw fa-times"/>' +
	'</button>' +
	'<button class="btn btn-primary btn-ximera-submit" data-toggle="tooltip" data-placement="top" title="Click to check your answer." style="z-index: 1;">' +
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

    
    result.on( 'ximera:statistics:answers', function(event, answers) {
	var total = Object.keys( answers ).map( function(x) { return answers[x]; } ).reduce(function(a, b) { return a + b; });

	var control = result.find( "input.form-control" );

	var table =
		'<table class="table table-striped">' +
		'<thead>' +
		'  <tr>' +
		'    <th>Count</th>' +
		'    <th>Response</th>' +
		'  </tr>' +
		'</thead><tbody>';

	var sortedAnswers = Object.keys( answers ).sort(function(a, b) {
	    return - ( +(answers[a] > answers[b]) || +(answers[a] === answers[b]) - 1 );
	});

	sortedAnswers.slice(0,3).forEach( function(answer) {
	    table = table + '<tr><td>' + answers[answer] + '</td><td>' + answer + '</td></tr>';
	});

	var additionalAnswers = sortedAnswers.slice(3,sortedAnswers.length).join(', ');
	
	table = table + '</tbody></table>';
	
	var modal = $('<div class="modal fade" tabindex="-1" role="dialog">' + 
		      '  <div class="modal-dialog">' + 
		      '    <div class="modal-content">' + 
		      '      <div class="modal-header">' + 
		      '        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' + 
		      '        <h4 class="modal-title">' + total + ' respones</h4>' + 
		      '      </div>' + 
		      '      <div class="modal-body">' + 
		      '        ' + table +
		      '        <p>Additional answers: ' + additionalAnswers + '<p>' +
		      '      </div>' + 
		      '      <div class="modal-footer">' + 
		      '        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' + 
		      '      </div>' + 
		      '    </div><!-- /.modal-content -->' + 
		      '  </div><!-- /.modal-dialog -->' + 
		      '</div><!-- /.modal -->');
	modal.uniqueId();
	
	$('body').prepend( modal );
	modal.find('button').click( function() { modal.modal('hide'); } );
	
	result.find('span.input-group-btn').prepend(
	    $('<button class="btn btn-info" data-toggle="tooltip" data-placement="top" title="' + total + ' responses">' +
  	      '<i class="fa fa-bar-chart"/>' +
	      '</button>')
	);

	result.find('button.btn-info').click( function() {
	    $('#' + modal.attr('id')).modal('show');
	    return false;
	});
	
	// fix the button size
	var width = result.width();
	inputBox.css( 'min-width', '2em' );
	inputBox.width( width - (138 - 70) - 45);
    });		
    
    result.on( 'ximera:statistics:successes', function(event, successes) {
	var total = Object.keys( successes ).map( function(x) { return successes[x]; } ).reduce(function(a, b) { return a + b; });

	if (!('true' in successes)) successes['true'] = 0;
	if (!('false' in successes)) successes['false'] = 0;
	
	var correctPercent = successes['true'] * 100.0 / total;
	var incorrectPercent = successes['false'] * 100.0 / total;
	var fraction = correctPercent;
	if (fraction == 0)
	    inputBox.css('background', 'rgba(255,0,0,0.08)');
	else if (fraction == 100)
	    inputBox.css('background', 'rgba(0,0,255,0.13)');
	else
	    inputBox.css('background', 'linear-gradient(90deg, rgba(0,0,255,0.13) ' + fraction + '%, rgba(255,0,0,0.08) ' + fraction + '%)' );
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

	    // I'm doing "result.find('.btn').hide();" but avoiding the info button
	    result.find('.btn-ximera-correct').hide();
	    result.find('.btn-ximera-incorrect').hide();
	    result.find('.btn-ximera-submit').hide();
	    
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

	try {	    
	    correctAnswer = Expression.fromLatex(correctAnswerText);
	} catch (err) {
	    try {	    		
		correctAnswer = Expression.fromText(correctAnswerText);
	    } catch (err) {
		console.log( "Instructor error in \\answer: " + err );
		correctAnswer = Expression.fromText( "sqrt(-1)" );
	    }
	}
	
	var studentAnswer;
	var studentAnswerText = inputBox.val();
	
	try {
	    studentAnswer = Expression.fromText( studentAnswerText );
	} catch (err) {
	    try {
		studentAnswer = Expression.fromLatex( studentAnswerText );
	    } catch (err) {
		studentAnswer = Expression.fromText( "sqrt(-1)" );
	    }
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

	result.trigger( 'ximera:attempt' );

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


