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
    },
});

// TODO: Add back in input-math
require( ["require", "angular", "shCore", "angular-animate", "bootstrap", "directives/mathjax", "directives/video-player", "directives/input-math", "moment", "activity-display", "shBrushJScript", "shBrushLatex", "mailing-list", "confirm-close", "chat"], function(require, angular, shCore) {
    'use strict';

    var app = angular.module('ximeraApp', ['ximeraApp.mathJax', 'ximeraApp.activity', 'ximeraApp.inputMath', 'ximeraApp.videoPlayer']);
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
