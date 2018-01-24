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
		'change': function(event) {
		    // Can test here
		},
		'done': function(event) {
		    console.log( guppyDiv.backend.get_content('xml') );
		    
		    var input = guppyDiv.backend.get_content('latex');
		    console.log(input);
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
	    },
	    "options":{
		'blank_caret': "\\color{red}{[?]}",
		'empty_content': "\\color{gray}{\\text{Click here to start typing a mathematical expression}}"
	    }
	});

	if (GuppyMath.init_symbols) {
            GuppyMath.init_symbols(["/public/symbols.json"]);
	} else {
	    console.log( "Warning: no GuppyMath.init_symbols" );
	}
	
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
	    guppyDiv.backend.insert_string('e');
	    guppyDiv.backend.insert_symbol('exp');	    
	    event.stopImmediatePropagation();
	    document.getElementById("guppy").focus();		
	} );

	guppyDiv.backend['right_paren'] = function() {
	    for( var i = 0; i<50; i++ ) {
		guppyDiv.backend.sel_left();
	    }
	    guppyDiv.backend.insert_symbol('paren');	    
	};

    }

    $('#guppy-save-button').click( function() {
	guppyDiv.backend.fire_event("done");
    });
});


module.exports.launch = function( text, f ) {
    callback = f;

    try {
	if (text.match(/^ *$/)) {
	    guppyDiv.backend.set_content('<m><e></e></m>');
	} else {
	    var expression = Expression.fromText( text );
	    guppyDiv.backend.set_content(expression.toXML());
	}
    } catch (err) {
	guppyDiv.backend.set_content('<m><e></e></m>');	
	//$('#guppy-error').text(err);
    }
    
    $('#guppymathModal').modal('show');
    guppyDiv.activate();    
};
