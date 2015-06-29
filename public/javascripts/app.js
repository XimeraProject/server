require.config({
    baseUrl: "/public/javascripts",
    waitSeconds: 200, // seems to fix things, sadly

    config: {
        moment: {
	    // Unfortunately x-editable is expecting a moment global
            // noGlobal: true
        }
    },
    
    paths: {
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

	angular: { exports: 'angular', deps: ['jquery'] },
        "angular-animate": { deps: ['angular'] },
        "angular-sanitize": { deps: ['angular'] },
        "angular-strap": { deps: ['angular', 'bootstrap', "angular-animate"] },
        "angular-strap-tpl": { deps: ['angular-strap'] },
	jquery: { exports: 'jQuery' },
	"bootstrap": { deps: ['jquery'] },
	"bootstrap-datepicker": { deps: ['jquery'] },

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
    },
});


require( ["angular", "shCore", "angular-animate", "bootstrap", "directives/mathjax", "directives/video-player", "directives/input-math", "moment", "activity-display", "coding-activity", "matrix-activity", "math-matrix", "shBrushJScript", "shBrushLatex", "mailing-list", "codemirror-python", "sticky-scroll", "score", "free-response", "user", 'angular-strap-tpl', 'popover', "forum", "pagedown-directive", "course", "jquery-ui"], function(angular, shCore) {
    'use strict';

    var module;
    
    if (module = $('script[src$="require.js"]').data('module')) {
	require([module]);
    }
    
    var app = angular.module('ximeraApp', ['ximeraApp.mathJax',
					   'ximeraApp.activity',
					   'ximeraApp.codingActivity',
					   'ximeraApp.inputMath',
					   'ximeraApp.videoPlayer',
					   'ximeraApp.matrixActivity',
					   'ximeraApp.mathMatrix',
					   'ximeraApp.freeResponse',
					   'ximeraApp.score',
					   'ximeraApp.user',
					   'ximeraApp.popover',
					   'ximeraApp.forum',
					   'ximeraApp.course',
					   'ximeraApp.pagedown',
					   'mgcrea.ngStrap']);

    $(document).ready(function() {
        angular.bootstrap(document, [app['name']]);
	shCore.SyntaxHighlighter.highlight();
	$(".dropdown-toggle").dropdown();
    });
});
