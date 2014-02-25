requirejs.config({
    baseUrl: "/public/javascripts",
    paths: {
	"jquery": "/components/jquery/jquery.min",
	"angular": "/components/angular/angular",
        "angular-animate": "/components/angular-animate/angular-animate",
        "angular-sanitize": "/components/angular-sanitize/angular-sanitize.min",
	"underscore": "/components/underscore/underscore",
	"x-editable": "/components/x-editable/dist/bootstrap-editable/js/bootstrap-editable.min",
	"threejs": "/components/threejs/build/three.min",
	"moment": "/components/moment/min/moment.min",

	"codemirror": "/components/codemirror/lib/codemirror",
	"codemirror-python": "/components/codemirror/mode/python/python",
	"skulpt": "/components/skulpt/skulpt.min",
	"skulpt-stdlib": "/components/skulpt/skulpt-stdlib",

	"pagedown-converter": "/components/pagedown-bootstrap/Markdown.Converter",
	"pagedown-sanitizer": "/components/pagedown-bootstrap/Markdown.Sanitizer",
	"pagedown-editor": "/components/pagedown-bootstrap/Markdown.Editor",

	"bootstrap": "/components/bootstrap/dist/js/bootstrap.min",
	"bootstrap-datepicker": "/components/bootstrap-datepicker/js/bootstrap-datepicker",

	"mathquill": "/components/mathquill/build/mathquill.min",

	'XRegExp': '/components/syntaxhighlighter/amd/XRegExp',
	'shCore': '/components/syntaxhighlighter/amd/shCore',

	'shBrushLatex': 'brushes/shBrushLatex',
	'shBrushJScript': '/components/syntaxhighlighter/amd/shBrushJScript',
	'shBrushPython': '/components/syntaxhighlighter/amd/shBrushPython',

	'socketio': '/socket.io/socket.io.js',

	'angular-strap': '/components/angular-strap/dist/angular-strap.min',
	'angular-strap-tpl': '/components/angular-strap/dist/angular-strap.tpl.min'
    },

    priority: [
	"angular"
    ],

    shim: {
	socketio: { exports: 'io' },
	underscore: { exports: '_' },
	angular: { exports: 'angular', deps: ['jquery'] },
        "angular-animate": { deps: ['angular'] },
        "angular-sanitize": { deps: ['angular'] },
        "angular-strap": { deps: ['angular', 'bootstrap', 'bootstrap-datepicker', "angular-animate"] },
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

// TODO: Add back in input-math
<<<<<<< HEAD
require( ["require", "angular", "shCore", "angular-animate", "bootstrap", "directives/mathjax", "directives/video-player", "directives/input-math", "moment", "activity-display", "coding-activity", "matrix-activity", "math-matrix", "shBrushJScript", "shBrushLatex", "mailing-list", "codemirror-python", "sticky-scroll", "score", "free-response", "user", 'angular-strap-tpl', "forum", "pagedown-directive"], function(require, angular, shCore) {
=======
require( ["require", "angular", "shCore", "angular-animate", "bootstrap", "directives/mathjax", "directives/video-player", "directives/input-math", "moment", "activity-display", "coding-activity", "matrix-activity", "math-matrix", "shBrushJScript", "shBrushLatex", "mailing-list", "codemirror-python", "sticky-scroll", "score", "free-response", "user", 'angular-strap-tpl', 'popover'], function(require, angular, shCore) {
>>>>>>> ad4f50879797c48ef370e0daaf61f7bb19b469ec
    'use strict';

    var app = angular.module('ximeraApp', ['ximeraApp.mathJax', 'ximeraApp.activity', 'ximeraApp.codingActivity', 'ximeraApp.inputMath', 'ximeraApp.videoPlayer', 'ximeraApp.matrixActivity',
					   'ximeraApp.mathMatrix', 'ximeraApp.freeResponse',
<<<<<<< HEAD
					   'ximeraApp.score', 'ximeraApp.user',
					   'ximeraApp.forum',
					   'ximeraApp.pagedown',
=======
					   'ximeraApp.score', 'ximeraApp.user', 'ximeraApp.popover',
>>>>>>> ad4f50879797c48ef370e0daaf61f7bb19b469ec
					   'mgcrea.ngStrap']);

    $(document).ready(function() {
        angular.bootstrap(document, [app['name']]);
	shCore.SyntaxHighlighter.highlight();
    });
});

/*
    script(src="/public/javascripts/setup-editable.js")
    script(src="/public/javascripts/remote-binding.js")
    script(src="https://www.youtube.com/iframe_api")
    script(src="/public/javascripts/video-player.js")
*/
