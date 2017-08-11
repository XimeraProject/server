// bootstrap is expecting a global jQuery object
var $ = window.$ = window.jQuery = require('jquery');
var jqueryUI = require('jquery-ui');
var jqueryTransit = require('jquery.transit');
var waypoint = require('waypoints/lib/jquery.waypoints.min.js');
var tether = require('tether');
window.Tether = tether;
var bootstrap = require('bootstrap');
var kinetic = require('jquery.kinetic/jquery.kinetic.min.js');

var syntaxHighlighter = require('syntaxhighlighter');
window.sh = syntaxHighlighter;
syntaxHighlighter.registerBrush(require('./brushes/shBrushLatex'));
syntaxHighlighter.registerBrush(require('brush-javascript'));
syntaxHighlighter.registerBrush( require('brush-python'));

var MathJax = require('./mathjax');

var activity = require('./activity');
var mathAnswer = require('./math-answer');
var ProgressBar = require('./progress-bar');

var userProfile = require('./user/profile');
var StickyScroll = require('./sticky-scroll' );

var xourse = require('./xourse');
var imageEnvironment = require('./image-environment');

var youtube = require('./youtube');
var instructor = require('./instructor');

var invigilator = require('./invigilator');
var clock = require('./clock');

var rowclick = require('./rowclick');

var references = require('./references');
var Desmos = require('./desmos');

var Javascript = require('./javascript');

MathJax.Hub.Config(
    {
	// You might think putput/SVG would be better,
	// but HTML-CSS is needed in order for the
	// answer input boxes to appear in the most
	// appropriate places
	jax: ["input/TeX","output/HTML-CSS"],
	extensions: ["tex2jax.js","MathMenu.js","CHTML-preview.js"],

	"HTML-CSS": {
	    availableFonts: ["TeX"],
	    imageFont: null
	},
	
	processEnvironments: true,
	showProcessingMessages: false,
	// BADBAD: this also breaks the layout triggers
	//showMathMenu: false,
	TeX: {
	    extensions: ["AMSmath.js","AMSsymbols.js","noErrors.js","noUndefined.js", "color.js"],
	    Macros: {}
	}
    });

MathJax.Hub.Register.MessageHook("TeX Jax - parse error",function (message) {
    // do something with the error.  message[1] will contain the data about the error.
    console.log(message);
});

MathJax.Hub.Register.MessageHook("Math Processing Error",function (message) {
    //  do something with the error.  message[2] is the Error object that records the problem.
    console.log(message);
});

MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
    // Remove CDATA's from the script tags
    MathJax.InputJax.TeX.prefilterHooks.Add(function (data) {
	data.math = data.math.replace(/<!\[CDATA\[\s*((.|\n)*)\s*\]\]>/m,"$1");
    });

    // Replace "answer" commands with DOM elements
    var VERSION = "1.0";
    
    var TEX = MathJax.InputJax.TeX,
	TEXDEF = TEX.Definitions,
	MML = MathJax.ElementJax.mml,
	HTML = MathJax.HTML;
    
    TEXDEF.macros.answer = "answer";
    TEXDEF.macros.graph = "graph";
    TEXDEF.macros.newlabel = "newlabel";
    TEXDEF.macros.sage = "sage";
    
    TEXDEF.macros.js = "js";

    var calculatorCount = 0;		    

    var getMathML = function(jax,callback) {
	var mml;
	try {
	    //
	    //  Try to produce the MathML (if an asynchronous
	    //     action occurs, a reset error is thrown)
	    //   Otherwise we got the MathML and call the
	    //     user's callback passing the MathML.
	    //
	    mml = jax.root.toMathML("");
	} catch(err) {
	    if (!err.restart) {throw err} // an actual error
	    //
	    //  For a delay due to file loading
	    //    call this routine again after waiting for the
	    //    the asynchronous action to finish.
	    //
	    return MathJax.Callback.After([getMathML,jax,callback],err.restart);
	}
	//
	//  Pass the MathML to the user's callback
	MathJax.Callback(callback)(mml);
    };
    
    /* Sometimes htlatex generates \relax's which should be ignored */
    MathJax.InputJax.TeX.Definitions.Add({
	macros: {
	    relax: ["Macro", ""],
	    ensuremath: ["Macro", ""],
	    xspace: ["Macro", ""]
	}});

    var sagetexExpansions = [];
    var sageCounter = 0;
    
    TEX.Parse.Augment({
	/* Implements sagetex */
	newlabel: function(name) {
	    var label = this.GetArgument(name);
	    var expansion = this.ParseArg(name);
	    
	    /* The primary assumption is that these appear in order. */
	    sagetexExpansions.push( expansion );
	},
	sage: function(name) {
	    var code = this.GetArgument(name);
	    
	    this.Push(sagetexExpansions[sageCounter]);
	    sageCounter++;
	},
	
	/* Implements \graph{y=x^2, r = theta} and the like */
	graph: function(name) {
	    // Load Desmos asynchronously
	    Desmos.loadAsynchronously();
	    
	    var optionalArguments = this.GetBrackets(name);
	    var equations = this.GetArgument(name);

	    var keys = {};
	    if( optionalArguments ) {
	        optionalArguments.split(/,/).forEach( function(kv) {
                    kv = kv.trim().split(/=/);
		    if(kv.length > 1 ) keys[kv[0]] = kv[1];
		    else keys[kv[0]] = true;
	        } );
	    }

            var id = "calculator" + calculatorCount;
            calculatorCount = calculatorCount + 1;
	    var element = HTML.Element("div",
				       {className:"calculator",
                                        id: id,
					style: {width: "30px", height: "300px"}
				       });
	    var mml = MML["annotation-xml"](MML.xml(element)).With({encoding:"application/xhtml+xml",isToken:true});
	    this.Push(MML.semantics(mml));

            MathJax.Hub.Queue( function () {
		var element = document.getElementById(id);
                var parent = $(element).closest( 'div.MathJax_Display' );
		parent.empty();
		element = parent;

		Desmos.onReady( function(Desmos) {
		    var calculator = Desmos.Calculator(element, {
			expressionsCollapsed: !keys.panel
		    });
		    window.calculator = calculator;

		    if (equations.match( /^\(.*\)$/ ))
			calculator.setExpression({id:'graph', latex: equations});
		    else {
			equations.split(',').forEach( function(equation, index) {
			    calculator.setExpression({id:'graph' + index, latex: equation});
			});
		    }
		    if( keys.xmax !== undefined ) {
			calculator.setMathBounds({
			    left: parseFloat(keys.xmin),
			    right: parseFloat(keys.xmax),
			    top: parseFloat(keys.ymax),
			    bottom: parseFloat(keys.ymin) });
		    }
		    if( keys.polar !== undefined ) {
			calculator.setGraphSettings({polarMode:true});
		    }
		    if( keys.hideXAxis ) {
			calculator.setGraphSettings({showXAxis:false});
		    }
		    if( keys.hideYAxis ) {
			calculator.setGraphSettings({showYAxis:false});
		    }
		    if( keys.xAxisLabel ) {
			calculator.setGraphSettings({xAxisLabel:keys.xAxisLabel});
		    }
		    if( keys.yAxisLabel ) {
			calculator.setGraphSettings({yAxisLabel:keys.yAxisLabel});
		    }
		    if( keys.hideXAxisNumbers ) {
			calculator.setGraphSettings({xAxisNumbers:false});
		    }
		    if( keys.hideYAxisNumbers ) {
			calculator.setGraphSettings({yAxisNumbers:false});
		    }
		    
                    // Bart requests that projectorMode be default
	            calculator.setGraphSettings({projectorMode:true});	
		    if( keys.projectorMode ) {
			calculator.setGraphSettings({projectorMode:true});	
		    }
		    if( keys.thinMode ) {
			calculator.setGraphSettings({projectorMode:false});
		    }
		    var height = keys.height || 300;
		    $(element).height(height);
		    calculator.resize();
		});
            });
	},

	/* Implements \js{code} */
	js: function(name) {
	    var code = this.GetArgument(name);
	    var value = Javascript.evaluateLatex(code);

	    var mml = TEX.Parse(value,this.stack.env).mml();

	    this.Push(mml);

	    var watcher = HTML.Element("span",
				     {className:"mathjax-javascript",
				      style: {display: "none"}
				     });
	    
	    watcher.setAttribute("data-code", code);
	    watcher.setAttribute("data-value", value);
	    	    
	    var watcherMml = MML["annotation-xml"](MML.xml(watcher)).With({encoding:"application/xhtml+xml",isToken:true});
	    this.Push(MML.semantics(watcherMml));
	},
	
	/* Implements \answer[key=value]{text} */
	answer: function(name) {
	    var keys = this.GetBrackets(name);
	    

	    var input = HTML.Element("input",
				     {type:"text",
				      className:"mathjax-input",
				      style: {width: "175px", marginBottom: "10px", marginTop: "10px" }
				     });


	    // Parse key=value pairs from optional [bracket] into data- attributes
	    if (keys !== undefined) {
		keys.split(",").forEach( function(keyvalue) { 
		    var key = keyvalue.split("=")[0];
		    var value = keyvalue.split("=").slice(1).join('=');
		    if (value === undefined)
			value = true;
		    
		    input.setAttribute("data-" + key, value);
		});
	    }	    
	    
	    input.setAttribute("xmlns","http://www.w3.org/1999/xhtml");

	    var text;
	    
	    var format = input.getAttribute("data-format");
	    if ((format == 'string') || (format == 'integer') || (format == 'float')) {
		text = this.GetArgument(name);
		input.setAttribute("data-answer", text);
	    } else {
		// This actually PARSES the content of the \answer command
		// with mathjax; the result will be MathML.  If we had
		// instead used this.GetArgument(name) we could have
		// gotten the raw string passed to \answer, but by using
		// ParseArg, we can invoke \newcommand's from inside an
		// \answer.
		text = this.ParseArg(name);

		// the \answer{contents} get placed in a data-answer attribute
		getMathML( MML(text), function( mml ) {
		    input.setAttribute("data-answer", mml);
		});
	    }
	    
	    var mml = MML["annotation-xml"](MML.xml(input)).With({encoding:"application/xhtml+xml",isToken:true});
	    this.Push(MML.semantics(mml));
	}
    });
});

MathJax.Hub.Configured();

$(document).ready(function() {

    // Make sage cells
    sagecell.makeSagecell({"inputLocation": ".sage"});
    sagecell.makeSagecell({"inputLocation": ".sageOutput", "hide": ["editor","evalButton"], "autoeval": true });

    // Make anchors with references from \ref actually work
    $('a.reference').reference();
    references.highlightTarget();
    
    // BADBAD: This seems like the wrong thing---why is default here?
    syntaxHighlighter.default.highlight();

    rowclick.addClickableTableRows();

    $('.kinetic').kinetic({});
    var active = $('.activity-card.active');
    if (active.length > 0) {
	var left = $('.activity-card.active').position().left;
	var cardWidth = $('.activity-card.active').width();
	var windowWidth = $('.kinetic').width();
	$('.kinetic').scrollLeft( left - windowWidth / 2 + cardWidth / 2 );
    }
    $('.activity-card a').mouseup(function(event) {
	if (( $('.kinetic-moving-left').length > 0 ) || ( $('.kinetic-moving-right').length > 0 )) {
	    event.preventDefault();
	}
    });
    
    $(".dropdown-toggle").dropdown();

    // This could go in "init" above, but it needs to be after the end process hook
    MathJax.Hub.Startup.onload();

    $(".activity").activity();
});

console.log("done.");

