require.config({
    baseUrl: "/public/javascripts",
    waitSeconds: 200, // seems to fix things, sadly

    config: {
        moment: {
	    // Unfortunately x-editable is expecting a moment global
            // noGlobal: true
        }
    },

    packages: [
	{
	    name: "math-expressions",
	    location: "../../components/math-expressions/amd",
	    main: "math-expressions"
	}
    ],
    
    paths: {
        //mathjax: "//cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS_HTML&amp;delayStartupUntil=configured",
	mathjax: "../../components/MathJax/MathJax",
	less: "../../components/less/dist/less.min",
	"async": "../../components/async/lib/async",
	"sly": "../../components/sly/dist/sly.min",
	"isotope": "../../components/isotope/dist/isotope.pkgd.min",
	"jquery": "../../components/jquery/dist/jquery.min",
	"jquery-ui": "../../components/jquery-ui/jquery-ui.min",
	"angular": "../../components/angular/angular",
        "angular-animate": "../../components/angular-animate/angular-animate.min",
        "angular-sanitize": "../../components/angular-sanitize/angular-sanitize.min",
	"underscore": "../../components/underscore/underscore",
	"x-editable": "../../components/x-editable/dist/bootstrap3-editable/js/bootstrap-editable.min",
	"threejs": "../../components/threejs/build/three.min",
	"moment": "../../components/moment/min/moment.min",
        "q": "../../components/q/q",

	"codemirror": "../../components/codemirror/lib/codemirror",
	"codemirror-python": "../../components/codemirror/mode/python/python",
	"skulpt": "../../components/skulpt/skulpt.min",
	"skulpt-stdlib": "../../components/skulpt/skulpt-stdlib",

	"pagedown-converter": "../../components/pagedown-bootstrap/Markdown.Converter",
	"pagedown-sanitizer": "../../components/pagedown-bootstrap/Markdown.Sanitizer",
	"pagedown-editor": "../../components/pagedown-bootstrap/Markdown.Editor",

	"bootstrap": "../../components/bootstrap/dist/js/bootstrap.min",
	"bootstrap-datepicker": "../../components/bootstrap-datepicker/js/bootstrap-datepicker",

	"mathquill": "../../components/mathquill/build/mathquill.min",

	'XRegExp': '../../components/syntaxhighlighter/amd/XRegExp',
	'shCore': '../../components/syntaxhighlighter/amd/shCore',

	'shBrushLatex': 'brushes/shBrushLatex',
	'shBrushJScript': '../../components/syntaxhighlighter/amd/shBrushJScript',
	'shBrushPython': '../../components/syntaxhighlighter/amd/shBrushPython',

	'requirejs': '../../components/requirejs/require',

	'angular-strap': '../../components/angular-strap/dist/angular-strap.min',
	'angular-strap-tpl': '../../components/angular-strap/dist/angular-strap.tpl.min',

	"js-quantities": "../../components/js-quantities/src/quantities",

	'md5': '../../components/JavaScript-MD5/js/md5.min'
    },

    priority: [
	"angular",
	"underscore"
    ],

    shim: {
	socketio: { exports: 'io' },

	sly: { exports: 'Sly' },

	angular: { exports: 'angular', deps: ['jquery'] },
        "angular-animate": { deps: ['angular'] },
        "angular-sanitize": { deps: ['angular'] },
        "angular-strap": { deps: ['angular', 'bootstrap', "angular-animate"] },
        "angular-strap-tpl": { deps: ['angular-strap'] },
	jquery: { exports: 'jQuery' },
	"bootstrap": { deps: ['jquery'] },
	"bootstrap-datepicker": { deps: ['jquery'] },

        "x-editable": { deps: ['jquery', 'jquery-ui'] },
	
	"pagedown-converter": { exports: 'Markdown.Converter', deps: ['bootstrap'] },
	"pagedown-sanitizer": { exports: 'Markdown.Sanitizer', deps: ['bootstrap', "pagedown-converter"] },
	"pagedown-editor": { exports: 'Markdown.Editor', deps: ['bootstrap', "pagedown-converter"] },

	"mathquill": { deps: ['jquery'] },

        'shCore': { deps: ['XRegExp'] },
        'shBrushJScript': { deps: ['shCore'] },
        'shBrushPython': { deps: ['shCore'] },

        'codemirror': { exports: 'CodeMirror' },
        'codemirror-python': { deps: ['codemirror'] },

        'skulpt': { exports: 'Sk' },
        'skulpt-stdlib': { deps: ['skulpt'] },

	
	mathjax: {
	    exports: "MathJax",
	    init: function () {
		MathJax.Hub.Config(
		    {
			// You might think putput/SVG would be better,
			// but HTML-CSS is needed in order for the
			// answer input boxes to appear in the most
			// appropriate places
			jax: ["input/TeX","output/HTML-CSS"],
			extensions: ["tex2jax.js","MathMenu.js","MathZoom.js", "CHTML-preview.js"],			
			showProcessingMessages: false,
			tex2jax: { inlineMath: [['$', '$'], ['\\(','\\)']],
				   displayMath: [['$$','$$'], ['\\[','\\]']] },
			TeX: {
			    extensions: ["AMSmath.js","AMSsymbols.js","noErrors.js","noUndefined.js", "color.js"],
			    Macros: {}
			}
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
		    
		    TEX.Parse.Augment({
			/* Implements \answer[key=value]{text} */
			answer: function(name) {
			    var keys = this.GetBrackets(name);
			    var text = this.GetArgument(name);

			    var input = HTML.Element("input",
						     {type:"text",
						      className:"mathjax-input",
						      style: {width: "160px", marginBottom: "10px", marginTop: "10px" }
						     });
			    
			    input.setAttribute("xmlns","http://www.w3.org/1999/xhtml");

			    // the \answer{contents} get placed in a data-answer attribute
			    input.setAttribute("data-answer", text);			    

			    // Parse key=value pairs from optional [bracket] into data- attributes
			    if (keys !== undefined) {
				keys.split(",").forEach( function(keyvalue) { 
				    var key = keyvalue.split("=")[0];
				    var value = keyvalue.split("=")[1];
				    if (value === undefined)
					value = true;
				    
				    input.setAttribute("data-" + key, value);
				});
			    }

			    
			    var mml = MML["annotation-xml"](MML.xml(input)).With({encoding:"application/xhtml+xml",isToken:true});
			    this.Push(MML.semantics(mml));			    
			}
		    });
		});

			
		return MathJax;
	    }
	}
    }
});


require( ["jquery", "shCore", "mathjax", "jquery-ui", "less", "database", "bootstrap", "moment", "shBrushJScript", "shBrushLatex", "mailing-list", "codemirror-python", "sticky-scroll", "user/profile", "math-answer", "activity", "score", "progress-bar", "xourse", "navigation"], function($, shCore, MathJax) {

    'use strict';

    var module;
    
    if (module = $('script[src$="require.js"]').data('module')) {
	require([module]);
    }

    $(document).ready(function() {
	shCore.SyntaxHighlighter.highlight();
	
	$(".dropdown-toggle").dropdown();
	
	// This could go in "init" above, but it needs to be after teh end process hook
	MathJax.Hub.Startup.onload();

	$(".activity").activity();
    });

});
