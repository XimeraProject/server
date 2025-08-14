var $ = require('jquery');
var jqueryUI = require('jquery-ui/ui/unique-id');
var _ = require('underscore');
var MathJax = require('./mathjax');
var TinCan = require('./tincan');
var database = require('./database');
var Expression = require('math-expressions');
var ProgressBar = require('./progress-bar');
var popover = require('./popover');
var Javascript = require('./javascript');
var palette = require('./math-palette');

var buttonlessTemplate = '<input class="form-control" type="text"/>';

// add labels for screenreader
var template = '<div class="input-group" style="width:100%">' +
   	'<input class="form-control answer-input-part" aria-label="answer" type="text"/>' +
        '<span class="input-group-btn answer-input-part">' +
	'<button class="px-0 btn btn-success btn-ximera-correct" data-toggle="tooltip" data-placement="top" title="Correct!" style="display: none; z-index: 1;" aria-label="Correct" aria-live="polite">' +
	'<i class="fa fa-fw fa-check"></i>' +
	'</button>' +
	'<button class="px-0 btn btn-danger btn-ximera-incorrect" data-toggle="tooltip" data-placement="top" title="Incorrect, try again!" style="display: none; z-index: 1;" aria-label="Incorrect, try again" aria-live="polite">' +
	'<i class="fa fa-fw fa-times"></i>' +
        '</button>' +
	'<button class="px-0 btn btn-primary disabled btn-ximera-checking" aria-label="Checking" data-toggle="tooltip" data-placement="top" title="Check..." style="z-index: 1; display: none;">' +
	'<i class="fa fa-fw fa-spinner fa-spin"></i>' +
	'</button>' +
	'<button class="px-0 btn btn-primary btn-ximera-submit" aria-label="Check" data-toggle="tooltip" data-placement="top" title="Click to check your answer." style="z-index: 1;">' +
	'<i class="fa fa-fw fa-question"></i>' +
	'</button>' +
	'</span>' +
	'<span class="input-group-btn show-answer-small">' +
	'<button class="px-0 btn btn-primary btn-info btn-ximera-show-answer" style="vertical-align:baseline" aria-label="Show Answer" data-toggle="tooltip" data-placement="top" title="Click to Show Answer." style="z-index: 1;">' +
	'<i class="fa fa-fw fa-key"></i>' +
	'</button>' +
	'</span>' +
	'<span class="input-group-btn show-answer-large" style="width:100%">' +
	'<button class="px-0 btn btn-primary btn-info btn-ximera-show-answer" style="vertical-align:baseline; width:100%" aria-label="Show Answer" data-toggle="tooltip" data-placement="top" title="Click to Show Answer." style="z-index: 1;">' +
	'<i class="fa fa-fw fa-key"></i><span class="show-answer-text">Show Answer</span>' +
	'</button>' +
	'</span>' +
	'</div>';

function parseFormattedInput( format, input ) {
    if (format == 'integer')
	return parseInt(input);
    else if (format == 'float')
	return parseFloat(input);
    else if (format == 'string')
	return input;
    else {
	try {
	    return Expression.fromText( input );
	} catch (err) {
	    try {
		return Expression.fromLatex( input );
	    } catch (err) {
		return undefined;
	    }
	}
    }

    return undefined;
}

function assignGlobalVariable( answerBox, text ) {
    var result = answerBox;
    
    if (result.attr('data-id')) {
	window[result.attr('data-id')] =
	    parseFormattedInput( result.attr('data-format'), text );

	Javascript.reevaluate(result);
    }
}

exports.createMathAnswer = function(input, showInput, showAnswerButton) {
    input = $(input);
    var width = input.width();

    var buttonless = false;
    // BADBAD: since the thing isn't in the DOM, I can't tell if it should be buttonless.
    /* TODO: removed this :)
    if (input.parents('.validator').length > 0) {
		result = $(buttonlessTemplate);
		buttonless = true;
	}
	*/

	/*if (showInput){
		if(showAnswerButton)
			input.append($(templateWithShow));
		else 
			input.append($(template))

	}
	else if (showAnswerButton) {
		input.append($(showAnswerTemplate))
	}*/

	input.append($(template))
	if(!showInput){
		input.find('.show-answer-small').hide()
		input.find('.answer-input-part').hide()
	}
	else{
		input.find('.show-answer-large').hide()
		if(!showAnswerButton){
			input.find('.show-answer-small').hide()
		}
	}

    return;
}

exports.connectMathAnswer = function(result, answer) {
    var buttonless = false;
    if (result.parents('.validator').length > 0) {
	buttonless = true;
    }
    
    // When the box changes, update the database AND any javascript variables
    var inputBox = result.find( "input.form-control" );
    
    inputBox.on( 'input', function() {
	var text = $(this).val();
	result.persistentData( 'response', text );
	assignGlobalVariable( result, text );	
    });

    // ACCESSIBILITY: unfortunately, we prevent spacebar from opening
    // a mathjax menu.  By enabling menus in mathjax, right-clicking
    // still opens the menu.
    //inputBox.on( 'keydown', function(event) {
    inputBox.on( 'keydown', function(event) {	
	if (event.keyCode == 32) {
	    event.stopPropagation();
	}
    });

    ////////////////////////////////////////////////////////////////
    // Link the "math editor" button in the toolbar to the CURRENTLY
    // FOCUSED textfield
    function updateMathEditButton() {
	if ($(document.activeElement).attr('data-input-box'))
	    $("#math-edit-button").show();
	else
	    $("#math-edit-button").hide();
    }

    /*
      If you happen to click outside a math input box, then the math
    editor will still be linked to your previous choice.
    inputBox.focusout( function() { window.setTimeout( function() {
    updateMathEditButton(); }, 100 ); });
    */
    
    inputBox.focus( function() {
	$(this).attr( 'data-input-box', true );
	updateMathEditButton();
	
	$("#math-edit-button").unbind("click");
	$("#math-edit-button").click( function() {
	    palette.launch( inputBox.val(),
			    function( err, text ) {
				inputBox.val(text),
				result.persistentData( 'response', text );
				assignGlobalVariable( result, text );
				inputBox.focus();
				inputBox.trigger('input');
			    });
	});
    });

    result.on( 'ximera:statistics:answers', function(event, answers) {
	var total = Object.keys( answers ).map( function(x) { return answers[x]; } ).reduce(function(a, b) { return a + b; });

	var control = result.find( "input.form-control" );

	var table =
		'<table class="table table-striped">' +
		'<thead>' +
		'  <tr>' +
		'    <th>Number</th>' +
		'    <th>Answer</th>' +
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
		      '        <h4 class="modal-title">' + total + ' Answers</h4>' + 
		      '      </div>' + 
		      '      <div class="modal-body">' + 
		      '        ' + table +
		      '        <p>Additional Answers: ' + additionalAnswers + '<p>' +
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
	    $('<button class="btn btn-info" data-toggle="tooltip" data-placement="top" title="' + total + '  Answers">' +
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
    if (!buttonless)    
	result.trigger( 'ximera:answer-needed' );
    
    // When the database changes, update the box
    result.persistentData( function(event) {
		console.log("Persisting " + result.attr("id"))
	if (result.persistentData('response')) {
	    if ($(inputBox).val() != result.persistentData('response')) {
		$(inputBox).val( result.persistentData('response'));
		assignGlobalVariable( result, result.persistentData('response') );
	    }
	} else {
	    $(inputBox).val( '' );
	}

	var mjElement = result.closest('.MathJax, .MathJax_Display')
	var divElement = mjElement.parent()
	var scriptElement = (divElement.attr('class') === 'MathJax_Display') ? divElement.next() :  mjElement.next()
	var solScriptElementId = scriptElement.attr('id') + "-sol"
	var tex = scriptElement.text()
	var a = MathJax.Hub.getAllJax(scriptElement.attr('id'))[0];
	$("#" + solScriptElementId).prev().remove()
	$("#" + solScriptElementId).remove()
	if (result.persistentData('correct')) {
	    result.find('.btn-ximera-correct').show();
	    result.find('.btn-ximera-incorrect').hide();
	    result.find('.btn-ximera-checking').hide();			    
	    result.find('.btn-ximera-submit').hide();
		
		result.find('.show-answer-small').hide();
		result.find('.show-answer-large').hide();
		
		if ((tex.match(/\\answer/g) || []).length === 1) {
			var answerRegExp = /\\answer (\[.*\])*{(.*)}/
			var m = tex.match(answerRegExp)
			if (m) {
				mjElement.hide()
				console.log(scriptElement.attr('type'))
				scriptElement.after("<script type='"+ scriptElement.attr('type') + "' id='" + solScriptElementId + "'>" + tex.replace(answerRegExp, "{\\color{blue} " + m[2] + "}")+"</script>")
				MathJax.Hub.Queue(["Typeset", MathJax.Hub, "#" + solScriptElementId]);
			}
		}

	    inputBox.prop( 'disabled', true );
	    // Disabled elements won't fire the blur event that would otherwise hide this
	    $(result).popover('hide');	    
	} else {
	    inputBox.prop( 'disabled', false );

	    // I'm doing "result.find('.btn').hide();" but avoiding the info button
	    result.find('.btn-ximera-correct').hide();
	    result.find('.btn-ximera-incorrect').hide();
	    result.find('.btn-ximera-checking').hide();			    	    
		result.find('.btn-ximera-submit').hide();

		if (scriptElement[0] && scriptElement[0].hasAttribute("data-initial") && scriptElement.attr("data-initial") !== tex){
			MathJax.Hub.Queue(["Text", a, scriptElement.attr("data-initial")]);
		}

		mjElement.show()
		
		var showInput = !result.is('[data-onlinenoinput]')
		var showAnswerButton = result.is('[data-onlineshowanswerbutton]')

		if (!showInput) {
			result.find('.show-answer-small').hide()
			result.find('.answer-input-part').hide()
			result.find('.show-answer-large').show()
		}
		else {
			result.find('.show-answer-large').hide()
			if (!showAnswerButton) {
				result.find('.show-answer-small').hide()
			}
			else {
				result.find('.show-answer-small').show()
			}
			result.find('.answer-input-part').show()
		}
	    
	    if ((result.persistentData('response') == result.persistentData('attempt')) &&
		(result.persistentData('response'))) {
		result.find('.btn-ximera-incorrect').show();
	    } else {
		result.find('.btn-ximera-submit').show();
	    }
	}
	
    });

    result.find( ".btn-ximera-correct" ).click( function() {
	return false;
    });

    result.find( ".btn-ximera-incorrect" ).click( function() {
	result.find( ".btn-ximera-submit" ).click();
	return false;
	});
	
	var correctAnswerText = answer.toMathML("");
	correctAnswerText = correctAnswerText.replace('<none>', '').replace('</none>', '');
	correctAnswerText = correctAnswerText.replace('<mphantom>', '<math>').replace('</mphantom>', '</math>');

	var correctAnswer;
	var format = result.attr('data-format');
	if (format === undefined) format = 'expression';

	if ((format == 'integer') || (format == 'float')) {
		correctAnswerText = correctAnswerText.replace('<math>', '').replace('</math>', '');
		correctAnswerText = correctAnswerText.replace('<mn>', '').replace('</mn>', '');
	}

	if (format == 'string') {
		correctAnswerText = correctAnswerText.replace('<math>', '').replace('</math>', '');
		correctAnswerText = correctAnswerText.replace('<mtext>', '').replace('</mtext>', '');
		correctAnswerText = correctAnswerText.trim();
	}

	if (format == 'integer') {
		correctAnswer = parseInt(correctAnswerText);
	} else if (format == 'float') {
		correctAnswer = parseFloat(correctAnswerText);
	} else if (format == 'string') {
		correctAnswer = correctAnswerText;
	} else {
		try {
			correctAnswer = Expression.fromLatex(correctAnswerText);

			if (!correctAnswer) {
				try {
					correctAnswer = Expression.fromLatex(correctAnswerText.toLowerCase());
				} catch (err) {
					correctAnswer = false;
				}
			}
		} catch (err) {
			try {
				correctAnswer = Expression.fromMml(correctAnswerText);
			} catch (err) {
				console.log("Instructor error in \\answer: " + err);
				correctAnswer = Expression.fromText("sqrt(-1)");
			}
		}
	}
    
	result.find( ".btn-ximera-submit" ).click( function() {
		// We're passing an "answer" from MathJax, as "jax"
		answer.parent = {inferRow: false};
		var studentAnswerText = inputBox.val();
		var studentAnswer = parseFormattedInput(format, studentAnswerText);
		if (studentAnswer === undefined)
			studentAnswer = Expression.fromText( "sqrt(-1)" );
		
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
			var correct = false;

			if (result.attr('data-validator')) {
			var code = result.attr('data-validator');
			try {
				var f = Function('return ' + code + ';');
			
				correct = f.call(studentAnswer);
				if (typeof correct === 'function')
				correct = correct(studentAnswer, correctAnswer);
			} catch (err) {
				console.log(err);
				correct = false;
			}
			} else {
			if (format === 'string') {
				// Strings should be normalized to uppercase when
				// doing case insensitive comparison, per
				// https://msdn.microsoft.com/en-us/library/bb386042.aspx
				correct = (correctAnswer.toUpperCase() == studentAnswer.toUpperCase());
			} else {
				if (format !== 'expression') {
				console.log( "compare ", correctAnswer, " and ", studentAnswer );
				correct = (correctAnswer == studentAnswer);
				} else
				correct = studentAnswer.equals( correctAnswer );
			}
			}

			// Check if the correct answer is actually a promise to check for correctness
			if (correct.then) {
			result.find('.btn-ximera-correct').hide();
			result.find('.btn-ximera-incorrect').hide();
			result.find('.btn-ximera-checking').show();
			result.find('.btn-ximera-submit').hide();
			// Disabled elements won't fire the blur event that would otherwise hide this		
			inputBox.prop( 'disabled', true );
			
			correct.then( function(value) {
				if (value) {
				result.persistentData( 'correct', true );
				result.trigger( 'ximera:correct' );
				} else {
				result.persistentData( 'correct', false );
				result.persistentData( 'attempt', inputBox.val() );
				}
			}, function(reason) {
				result.find('.btn-ximera-correct').hide();
				result.find('.btn-ximera-incorrect').hide();
				result.find('.btn-ximera-checking').hide();
				result.find('.btn-ximera-submit').show();
				inputBox.prop( 'disabled', false );

				alert(reason);
			});
			} else {
			if (correct) {
				result.persistentData( 'correct', true );
				result.trigger( 'ximera:correct' );
			} else {
				result.persistentData( 'correct', false );
				result.persistentData( 'attempt', inputBox.val() );
			}
			}
		}

		result.trigger( 'ximera:attempt' );

		TinCan.answer( result, { response: result.persistentData('response'),
					success: result.persistentData('correct') } );
		
		return false;
	});

	result.find(".btn-ximera-show-answer").click(function(){ // TODO: log that this button has been clicked
		result.find('.show-answer-large').hide()
		result.find('.show-answer-small').hide()
		result.find('.answer-input-part').show()

		result.find('[aria-label="answer"]').val(correctAnswer)
		result.find('input.form-control').focus()
		result.find('input.form-control').trigger('input')
		
		result.find(".btn-ximera-submit").click()

		return false;
	})

    
    inputBox.keydown(function(event){
	if(event.keyCode == 13) {
	    event.preventDefault();
	    return false;
	}
    });
    
    inputBox.keyup(function(event) {
	if (buttonless)
	    result.closest('.validator').trigger( 'ximera:answers-changed' );
	
	if (event.keyCode == 13) {
	    if (!buttonless)
		result.find( ".btn-ximera-submit" ).click();
	    else {
		// Submit the validator if it is wrapped in a validator
		result.closest( '.validator' ).find( ".btn-ximera-submit" ).click();
	    }
	}

	return false;
    });
    
    popover.bindPopover( result );
};



