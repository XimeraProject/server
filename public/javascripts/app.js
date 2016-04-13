require.config({
    baseUrl: "/public/javascripts",
    //waitSeconds: 200, // seems to fix things, sadly

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
        mathjax: "//cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS_HTML&amp;delayStartupUntil=configured",
        desmos: "https://www.desmos.com/api/v0.7/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6",
	
	less: "../../components/less/dist/less.min",
	socketio: '../../components/socket.io-client/socket.io',
	"async": "../../components/async/lib/async",
	"sly": "../../components/sly/dist/sly.min",
	"isotope": "../../components/isotope/dist/isotope.pkgd.min",
	"jquery": "../../components/jquery/dist/jquery.min",
	"jquery-ui": "../../components/jquery-ui/jquery-ui.min",
	"jquery-fullsizable": "../../components/jquery-fullsizable/js/jquery-fullsizable.min",
	"angular": "../../components/angular/angular",
        "angular-animate": "../../components/angular-animate/angular-animate.min",
        "angular-sanitize": "../../components/angular-sanitize/angular-sanitize.min",
	"underscore": "../../components/underscore/underscore",
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

	'XRegExp': '../../components/syntaxhighlighter/amd/XRegExp',
	'shCore': '../../components/syntaxhighlighter/amd/shCore',

	'shBrushLatex': 'brushes/shBrushLatex',
	'shBrushJScript': '../../components/syntaxhighlighter/amd/shBrushJScript',
	'shBrushPython': '../../components/syntaxhighlighter/amd/shBrushPython',

	'requirejs': '../../components/requirejs/require',

	"js-quantities": "../../components/js-quantities/src/quantities",

	"eonasdan-bootstrap-datetimepicker": "../../components/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min",
	
	'md5': '../../components/JavaScript-MD5/js/md5.min',
    },

    priority: [
	"angular",
	"underscore"
    ],

    shim: {
	socketio: { exports: 'io' },

	sly: { exports: 'Sly', deps: ['jquery'] },
	
	angular: { exports: 'angular', deps: ['jquery'] },
        "angular-animate": { deps: ['angular'] },
        "angular-sanitize": { deps: ['angular'] },
        "angular-strap": { deps: ['angular', 'bootstrap', "angular-animate"] },
        "angular-strap-tpl": { deps: ['angular-strap'] },
	jquery: { exports: 'jQuery' },
	"jquery-ui": { deps: ['jquery'] },
	"jquery-fullsizable": { deps: ['jquery'] },	
	"bootstrap": { deps: ['jquery'] },	

	"eonasdan-bootstrap-datetimepicker": { deps: ['jquery', 'moment'] },
	
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
	'desmos': { exports: 'Desmos' },
	
	mathjax: {
	    exports: "MathJax",
	    deps: ["desmos"],
	    init: function (Desmos) {

		return MathJax;
	    }
	}
    }
});


// no longer using codemirror-python?
require( ["jquery", "shCore", "mathjax", "jquery-ui", "shBrushJScript", "shBrushLatex", 
	  "less", "database", "bootstrap", "moment", "mailing-list", "sticky-scroll", "user/profile", "math-answer", "activity", "score", "progress-bar", "xourse", "navigation", "image-environment", "youtube",
	  "invigilator", "clock","instructor"],
	  function($, shCore, MathJax) {

    'use strict';

    $(document).ready(function() {
	shCore.SyntaxHighlighter.highlight();
	
	$(".dropdown-toggle").dropdown();
	
	// This could go in "init" above, but it needs to be after teh end process hook
	MathJax.Hub.Startup.onload();

	$(".activity").activity();
    });

});
