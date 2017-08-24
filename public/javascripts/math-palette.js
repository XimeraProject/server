var $ = require('jquery');

// https://github.com/daniel3735928559/guppy
var GuppyMath = require('guppymath/src/guppy.js');

var Expression = require('math-expressions');

var guppyDiv = undefined;
var callback = undefined;

$(function() {
    if ($("#guppy").length > 0) {
	guppyDiv = new GuppyMath("guppy", {
	    "events":{
		'done': function(event) {
		    console.log( guppyDiv.backend.get_content('xml') );
		    
		    var input = guppyDiv.backend.get_content('latex');
		    console.log(input);
		    try {
			var output = Expression.fromLatex( input.replace(/\\dfrac/g,'\\frac') ).toString();
			$('#guppymathModal').modal('hide');

			callback( null, output );
		    } catch (err) {
			$('#guppy-error').text(err);
		    }
		},
		'completion': console.log
	    },
	    "options":{
		//'blank_caret': "[?]",
		'empty_content': "\\color{gray}{\\text{Click here to start typing a mathematical expression}}"
	    }
	});
        GuppyMath.init_symbols(["/node_modules/guppymath/sym/symbols.json"]);

	function symbolizer( id, sym ) {
	    $('#guppy-' + id).mousedown( function(event) {
		guppyDiv.backend.insert_symbol(sym);
		event.stopImmediatePropagation();
		document.getElementById("guppy").focus();		
	    } );
	}

	function stringizer( id, str ) {
	    $('#guppy-' + id).mousedown( function(event) {
		guppyDiv.backend.insert_string(str);
		event.stopImmediatePropagation();
		document.getElementById("guppy").focus();
	    } );
	}	

	symbolizer( 'pi', 'pi' );
	symbolizer( 'sqrt', 'sqrt' );
	symbolizer( 'root', 'root' );
	stringizer( 'times', '*' );
	stringizer( 'plus', '+' );
	stringizer( 'minus', '-' );
	symbolizer( 'divide', 'frac' );
	symbolizer( 'paren', 'paren' );
	symbolizer( 'abs', 'abs' );
	symbolizer( 'exp', 'exp' );
    }

    $('#guppy-save-button').click( function() {
	guppyDiv.backend.fire_event("done");
    });
});


module.exports.launch = function( text, f ) {
    callback = f;

    try {
	var expression = Expression.fromText( text );
	window.e = expression;
	guppyDiv.backend.set_content(expression.toXML());
    } catch (err) {
	$('#guppy-error').text(err);
    }
    
    $('#guppymathModal').modal('show');
};
