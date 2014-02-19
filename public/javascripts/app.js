requirejs.config({
    baseUrl: "/public/javascripts",
    paths: {
	"jquery": "/components/jquery/jquery.min",
	"angular": "/components/angular/angular",
        "angular-animate": "/components/angular-animate/angular-animate",
	"underscore": "/components/underscore/underscore",
	"x-editable": "/components/x-editable/dist/bootstrap-editable/js/bootstrap-editable.min",
	"threejs": "/components/threejs/build/three.min",
	"moment": "/components/moment/min/moment.min",

	"codemirror": "/components/codemirror/lib/codemirror",
	"codemirror-python": "/components/codemirror/mode/python/python",
	"ui-codemirror": "/components/angular-ui-codemirror/ui-codemirror",

	"pagedown-converter": "/components/pagedown-bootstrap/Markdown.Converter",
	"pagedown-sanitizer": "/components/pagedown-bootstrap/Markdown.Sanitizer",
	"pagedown-editor": "/components/pagedown-bootstrap/Markdown.Editor",

	"bootstrap": "/components/bootstrap/dist/js/bootstrap.min",

	"mathquill": "/components/mathquill/build/mathquill.min",

	'XRegExp': '/components/syntaxhighlighter/amd/XRegExp',
	'shCore': '/components/syntaxhighlighter/amd/shCore',

	'shBrushLatex': 'brushes/shBrushLatex',
	'shBrushJScript': '/components/syntaxhighlighter/amd/shBrushJScript',
	'shBrushPython': '/components/syntaxhighlighter/amd/shBrushPython',

	'socketio': '/socket.io/socket.io.js'
    },

    priority: [
	"angular"
    ],

    shim: {
	socketio: { exports: 'io' },
	underscore: { exports: '_' },
	angular: { exports: 'angular', deps: ['jquery'] },
        "angular-animate": { deps: ['angular'] },
	jquery: { exports: 'jQuery' },
	"bootstrap": { deps: ['jquery'] },

	"pagedown-converter": { exports: 'Markdown.Converter', deps: ['bootstrap'] },
	"pagedown-sanitizer": { exports: 'Markdown.Sanitizer', deps: ['bootstrap'] },
	"pagedown-editor": { exports: 'Markdown.Editor', deps: ['bootstrap', "pagedown-converter"] },

	"mathquill": { deps: ['jquery'] },

        'shCore': { deps: ['XRegExp'] },
        'shBrushJScript': { deps: ['shCore'] },
        'shBrushPython': { deps: ['shCore'] },

        'codemirror': { exports: 'CodeMirror' },
        'codemirror-python': { deps: ['codemirror'] },
        'ui-codemirror': { deps: ['codemirror', 'angular'] },
    },
});

// TODO: Add back in input-math
require( ["require", "angular", "shCore", "angular-animate", "bootstrap", "directives/mathjax", "directives/video-player", "directives/input-math", "moment", "activity-display", "coding-activity", "shBrushJScript", "shBrushLatex", "mailing-list", "confirm-close", "chat", "ui-codemirror", "codemirror-python"], function(require, angular, shCore) {
    'use strict';

    var app = angular.module('ximeraApp', ['ximeraApp.mathJax', 'ximeraApp.activity', 'ximeraApp.codingActivity', 'ximeraApp.inputMath', 'ximeraApp.videoPlayer', 'ui.codemirror']);

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
