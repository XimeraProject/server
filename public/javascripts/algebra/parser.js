define(["underscore", "algebra/text-to-ast", "algebra/ast-to-text", "algebra/ast-to-latex", "algebra/latex-to-ast"], function(_, textToAst, astToText, astToLatex, latexToAst){

    kinds = ['text', 'latex', 'ast'];

    // define the basic converters
    converters = {
	latex: {
	    to: { 
		ast: latexToAst,
	    }
	},
	text: {
	    to: { 
		ast: textToAst,
	    }
	},
	ast: {
	    to: {
		text: astToText,
		latex: astToLatex,
	    }
	}
    };

    // compute the transitive closure
    var foundNew = true;

    while( foundNew ) {
	foundNew = false;

	_.each( kinds, function(a) {
	    if (a in converters) {
		_.each( kinds, function(b) {
		    if ((b in converters) && (b in converters[a].to)) {
			_.each( kinds, function(c) {
			    if ((c in converters[b].to) && (!(c in converters[a].to))) {
				foundNew = true;
				converters[a].to[c] = _.compose( converters[b].to[c], converters[a].to[b] );
			    }
			});
		    }
		});
	    }
	});
    }

    return converters;
});
