console.log("  ▀██▄   ▄██▀ ██ █████     █████ ▄███████████████████▄    ███");
console.log("    ▀██▄██▀   ██▐██ ▐██   ██▌ ██▌██                 ██▌  ██▀██");
console.log("      ███     ██▐██  ██▌ ▐██  ██▌▐█████████ ▄████████▀  ██▀ ▀██");
console.log("    ▄██▀██▄   ██▐██  ▐██ ██▌  ██▌██        ▐█▌  ▀██▄   ██▀   ▀██");
console.log("  ▄██▀   ▀██▄ ██▐██   ▀███▀   ██▌▀█████████▐█▌    ▀██▄██▀     ▀██");
require('./version');

/* Definitely not ready for a serviceworker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', {scope: '/'})
	.then(function(reg) {
	    console.log('Registered Service Worker.');

	    window.updateServiceWorker = function() {
		console.log('updating sw');
		reg.update();
	    };
	}).catch(function(error) {
	    console.log('Registration failed: ' + error);
	});
}
*/

// bootstrap is expecting a global jQuery object
var $ = window.$ = window.jQuery = require('jquery');

// jsondiffpatch expects this loaded globally
window.diff_match_patch = require('diff-match-patch');

require('./cache-bust');

var Expression = require('math-expressions');

var jqueryUI = require('jquery-ui');
var jqueryTransit = require('jquery.transit');
var tether = require('tether');
window.Tether = tether;
var bootstrap = require('bootstrap');
var kinetic = require('jquery.kinetic/jquery.kinetic.min.js');

require('./chat');

var syntaxHighlighter = require('syntaxhighlighter');
window.sh = syntaxHighlighter;
syntaxHighlighter.registerBrush(require('./brushes/shBrushLatex'));
syntaxHighlighter.registerBrush(require('brush-javascript'));
syntaxHighlighter.registerBrush( require('brush-python'));

var MathJax = require('./mathjax');

var activity = require('./activity');
var mathAnswer = require('./math-answer');
var ProgressBar = require('./progress-bar');

var userProfile = require('./profile');
var users = require('./users');
var StickyScroll = require('./sticky-scroll' );

var xourse = require('./xourse');
var imageEnvironment = require('./image-environment');

var instructor = require('./instructor');

var rowclick = require('./rowclick');
var supervision = require('./supervision');

var references = require('./references');
var Desmos = require('./desmos');

var Javascript = require('./javascript');

var sagemath = require('./sagemath');

var pencil = require('./pencil');

MathJax.Hub.Register.MessageHook("TeX Jax - parse error",function (message) {
    // do something with the error.  message[1] will contain the data about the error.
    console.log(message);
});

MathJax.Hub.Register.MessageHook("Math Processing Error",function (message) {
    //  do something with the error.  message[2] is the Error object that records the problem.
    console.log(message);
});

// Cervone says this will speed things up
MathJax.Hub.processSectionDelay = 0;
MathJax.Hub.processUpdateTime = 0;

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
    TEXDEF.macros.sagestr = "sagestr";
    TEXDEF.macros.delimiter = "delimiter";
    
    TEXDEF.macros.js = "js";

    var calculatorCount = 0;		    
    
    /* Sometimes htlatex generates \relax's which should be ignored */
    MathJax.InputJax.TeX.Definitions.Add({
	macros: {
	    relax: ["Macro", ""],
	    ensuremath: ["Macro", ""],
	    xspace: ["Macro", ""]
	}});

    TEX.Parse.Augment({
	/* sage emits delimiter commands pretty frequently? */
	delimiter: function(name) {
	    var d = this.GetArgument(name);

	    if (d.match(/426830A/)) {
		var mml = TEX.Parse("\\langle",this.stack.env).mml();
		this.Push(mml);
		return;
	    }

	    if (d.match(/526930B/)) {
		var mml = TEX.Parse("\\rangle",this.stack.env).mml();
		this.Push(mml);
		return;
	    }	    
	},
	
	// https://stackoverflow.com/questions/38726590/replace-variable-in-mathjax-equation
	sage: function(name) {
	    return this.sagestr(name, true);
	},
	
	sagestr: function(name, latexify) {
	    var code = this.GetArgument(name);
	    
	    if (latexify)
		code = "latex(" + code + ")";

	    var spinner = HTML.Element("i", {className:"fa fa-spinner fa-spin"});
	    var spinnerMml = MML["annotation-xml"](MML.xml(spinner)).With({encoding:"application/xhtml+xml",isToken:true});
	    var placeholder = MML.none( MML.semantics(spinnerMml) );
	    this.Push(placeholder);

	    var env = this.stack.env;
	    var that = this;

	    sagemath.sage(code).then( function(result) {
		// The sagecell server returns quoted strings?  Let's
		// unquote them in this unsafe way.
		if (latexify != true)
		    result = eval(result);
		
		MathJax.Hub.Queue( [function () {
		    // We act as if we are "Translate"ing the TeX into
		    // MML, so most of this is copied from MathJax's
		    // input/TeX/jax.js
		    var mml = TEX.Parse(result, env).mml();

		    // I have no idea what this does, but MathJax's
		    // Translate command does it, and it doesn't work
		    // without it.
		    if (mml.inferred)
			mml = MML.apply(MathJax.ElementJax,mml.data);
		    else
			mml = MML(mml);

		    // Copy the newly Translate'd TeX over to the
		    // placeholder "mnone" MathML element
		    placeholder.data = mml.root.data;

		    // We need to figure out our MathJax ID so we can
		    // request a Rerender
		    var parent = placeholder;
		    while( parent.parent != undefined )
			parent = parent.parent;
		    
		    if (parent.inputID)
			MathJax.Hub.Queue(["Rerender", MathJax.Hub, parent.inputID]);

		    return;
		}]);

	    }, function(err) {
		console.log(err);
		// BADBAD: Display the error
	    });
	    
	    return;
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

	    var input = HTML.Element("form",
				     {className:"form-inline mathjaxed-input",
				      style: {width: "155px", marginBottom: "10px", marginTop: "10px", display: "inline-block" },
				     });
	    input.setAttribute("xmlns","http://www.w3.org/1999/xhtml");
	    
	    // Parse key=value pairs from optional [bracket] into data- attributes
	    var options = {};
	    if (keys !== undefined) {
		keys.split(",").forEach( function(keyvalue) { 
		    var key = keyvalue.split("=")[0];
		    var value = keyvalue.split("=").slice(1).join('=');
		    if (value === undefined)
			value = true;

		    input.setAttribute("data-" + key,value);
		    
		    options[key] = value;
		});
	    }
	    	    
	    var format = options['format'];
	    var answer;
	    
	    if (format == 'string') {
		answer = this.GetArgument(name);
		answer = MML.mtext(answer);
	    } else if ((format == 'integer') || (format == 'float')) {
		answer = this.GetArgument(name);
		answer = MML.mn(answer);
	    } else {
		// This actually PARSES the content of the \answer command
		// with mathjax; the result will be MathML.  If we had
		// instead used this.GetArgument(name) we could have
		// gotten the raw string passed to \answer, but by using
		// ParseArg, we can invoke \newcommand's from inside an
		// \answer.
		answer = this.ParseArg(name);
	    }

	    // Attempt to change size if we have a short answer
	    try {
		answer.parent = {inferRow: false};
		var correctAnswerMml = answer.toMathML("");	
		var correctAnswer = Expression.fromMml(correctAnswerMml).toString().toString();
		console.log( correctAnswer.length );		
		if (correctAnswer.length <= 3) {
		    input.classList.add('narrow'); // to eliminate some padding
		    input.style.width = "70px";
		}
	    } catch (err) {
	    }
	    
	    this.Push(MML.mpadded(MML.mphantom(answer)).With({height: 0, width: 0}));

	    mathAnswer.createMathAnswer( input );

	    var xml = MML.xml(input);
	    var mml = MML["annotation-xml"](xml).With({encoding:"application/xhtml+xml",isToken:true});
	    var semantics = MML.semantics(mml);
	    this.Push(semantics);
	    this.Push(MML.mpadded().With({height: "30px", width: 0}));

	    return;
	}
    });
});

function searchJax(jax, spanID){
    // Sometimes the jax is null?  I don't really know why.
    if (jax === null)
	return null;
    
     if(jax.spanID == spanID){
          return jax;
     } else if (jax.data != null){
          var i;
         var result = null;
         for(i=0; result == null && i < jax.data.length; i++){
             result = searchJax(jax.data[i], spanID);
         }
         return result;
     }
     return null;
}

var answerIdBindings = {};

MathJax.Hub.signal.Interest(function (message) {    
    if (message[0] == "New Math") {
	var id = message[1];

	if (answerIdBindings[id] === undefined) {
	    answerIdBindings[id] = {};
	}

	var element = $('#' + id + "-Frame");
	var jax = MathJax.Hub.getAllJax(id);

	var internalCount = 0;
	
	$(".mathjaxed-input", element).each( function() {
	    var result = $(this);
	    
	    if (answerIdBindings[id][internalCount] === undefined) {
		// Number the answer boxes in order
		var problem = result.parents( ".problem-environment" ).first();
		var count = problem.attr( "data-answer-count" );
		if (typeof count === typeof undefined || count === false) {
		    count = 0;
		}
    
		problem.attr( "data-answer-count", parseInt(count) + 1 );
		var problemIdentifier = problem.attr( "id" );

		// Store the answer index as an id
		answerIdBindings[id][internalCount] = "answer" + count + problemIdentifier;
	    }
	    
	    result.attr('id', answerIdBindings[id][internalCount] );
	    internalCount = internalCount + 1;

	    var answerDom = result.closest('.semantics').prev('.mpadded').find('.mphantom').first();
	    var answerId = parseInt(answerDom.attr('id').replace('MathJax-Span-',''));
	    var answer = searchJax(jax[0].root, answerId);

	    mathAnswer.connectMathAnswer( result, answer );
	});
    }
});


MathJax.Hub.Configured();

$(document).ready(function() {
    // Make anchors with references from \ref actually work
    $('a.ximera-label').texLabel();
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

    // This is both mouseup for desktop
    $('.activity-card a').bind( "mouseup", function(event){
	if (( $('.kinetic-moving-left').length > 0 ) || ( $('.kinetic-moving-right').length > 0 )) {
	    event.preventDefault();
	}
    });

    // This handles touchscreens; moving less than 100 pixels in less
    // than 500 ms should count as a click
    var position = 0;
    var distance = 0;
    var startTime = 0;
    $('.activity-card').on( "touchstart", function(e){
	position = e.originalEvent.touches[0].screenX;
	distance = 0;
	startTime = e.originalEvent.timeStamp
    });
    
    $('.activity-card').on( "touchmove", function(e){
	var newPosition = e.originalEvent.touches[0].screenX;
	distance = distance + Math.abs( newPosition - position );
	position = newPosition;
    });    

    $('.activity-card').on( "touchend", function(e){
	var duration = e.originalEvent.timeStamp - startTime;
	if ((distance < 100) && (duration < 500)) {
	    window.location.href = $(this).children('a').attr('href');
	}
    });

    $(".dropdown-toggle").dropdown();

    $('[data-toggle="tooltip"]').tooltip();

    // This could go in "init" above, but it needs to be after the end process hook
    MathJax.Hub.Startup.onload();

    $(".activity").activity();
});

console.log("done.");

