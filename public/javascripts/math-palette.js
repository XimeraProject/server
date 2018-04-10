var $ = require('jquery');

// https://github.com/daniel3735928559/guppy
var Guppy = require('guppy-dev/src/guppy.js');

var Expression = require('math-expressions');
var guppyDiv = undefined;
var callback = undefined;

$(function() {
    if ($("#guppy").length > 0) {
	Guppy.init({"path":"/lib/guppy",
		    "symbols":"/public/json/symbols.json"
		   });
	
	guppyDiv = new Guppy("guppy", {
 	    settings: {
		"buttons": []
	    },
	    "events":{
		'done': function(event) {
		    var input = guppyDiv.engine.get_content('latex');
		    try {
			var output = Expression.fromLatex( input
							   .replace(/\\dfrac/g,'\\frac')
							   .replace(/\\cdot/g, ' ')
							 ).toString();
			$('#guppymathModal').modal('hide');

			callback( null, output );
		    } catch (err) {
			$('#guppy-error').text(err);
		    }
		}
	    }
	});

	function symbolizer( id, sym ) {
	    $('#guppy-' + id).mousedown( function(event) {
		guppyDiv.engine.insert_symbol(sym);
		event.stopImmediatePropagation();
		document.getElementById("guppy").focus();		
	    } );
	}

	function stringizer( id, str ) {
	    $('#guppy-' + id).mousedown( function(event) {
		guppyDiv.engine.insert_string(str);
		event.stopImmediatePropagation();
		document.getElementById("guppy").focus();
	    } );
	}	

	symbolizer( 'pi', 'pi' );
	symbolizer( 'theta', 'theta' );
	symbolizer( 'phi', 'phi' );
	symbolizer( 'rho', 'rho' );
	
	symbolizer( 'sqrt', 'sqrt' );
	symbolizer( 'root', 'root' );
	stringizer( 'times', '*' );
	stringizer( 'plus', '+' );
	stringizer( 'minus', '-' );
	symbolizer( 'slash', 'slash' );
	symbolizer( 'paren', 'paren' );
	symbolizer( 'abs', 'abs' );
	symbolizer( 'exp', 'exp' );

	stringizer( 'sin', 'sin' );
	stringizer( 'cos', 'cos' );
	stringizer( 'tan', 'tan' );
	stringizer( 'log', 'log' );
	stringizer( 'ln', 'ln' );
	stringizer( 'arcsin', 'arcsin' );
	stringizer( 'arccos', 'arccos' );
	stringizer( 'arctan', 'arctan' );
	
	$('#guppy-etothe').mousedown( function(event) {
	    guppyDiv.engine.insert_string('e');
	    guppyDiv.engine.insert_symbol('exp');	    
	    event.stopImmediatePropagation();
	    document.getElementById("guppy").focus();		
	} );

    }

    $('#guppy-save-button').click( function() {
	guppyDiv.engine.done();
    });
});


module.exports.launch = function( text, f ) {
    callback = f;

    try {
	if (text.match(/^ *$/)) {
	    guppyDiv.engine.set_content('<m><e></e></m>');
	} else {
	    var expression = Expression.fromText( text );
	    guppyDiv.engine.set_content(expression.toXML());
	}
    } catch (err) {
	guppyDiv.engine.set_content('<m><e></e></m>');	
	//$('#guppy-error').text(err);
    }
    
    $('#guppymathModal').modal('show');
    guppyDiv.activate();    
};
