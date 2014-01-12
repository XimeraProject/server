requirejs.config({
    baseUrl: "/public/javascripts",
    paths: {
	"jquery": "/components/jquery/jquery.min",
	"angular": "/components/angular/angular",
	"underscore": "/components/underscore/underscore-min",
	"x-editable": "/components/x-editable/dist/bootstrap-editable/js/bootstrap-editable.min",
	"threejs": "/components/threejs/build/three.min",
	"moment": "/components/moment/min/moment.min",

	"pagedown-converter": "/components/pagedown-bootstrap/Markdown.Converter",
	"pagedown-sanitizer": "/components/pagedown-bootstrap/Markdown.Sanitizer",
	"pagedown-editor": "/components/pagedown-bootstrap/Markdown.Editor",

	"bootstrap": "/components/bootstrap/dist/js/bootstrap.min",

	"mathquill": "/components/mathquill/build/mathquill.min",

	'XRegExp': '/components/syntaxhighlighter/scripts/XRegExp',
	'shCore': '/components/syntaxhighlighter/scripts/shCore',

	'shBrushJScript': '/components/syntaxhighlighter/scripts/shBrushJScript',
	'shBrushPython': '/components/syntaxhighlighter/scripts/shBrushPython',
    },

    priority: [
	"angular"
    ],

    shim: {
	underscore: { exports: '_' },
	angular: { exports: 'angular', deps: ['jquery'] },
	jquery: { exports: 'jQuery' },
	"bootstrap": { deps: ['jquery'] },

	"pagedown-converter": { deps: ['bootstrap'] },
	"pagedown-sanitizer": { deps: ['bootstrap'] },
	"pagedown-editor": { deps: ['bootstrap'] },

	"mathquill": { deps: ['jquery'] },

        'shCore': { deps: ['XRegExp'] },
        'shBrushJScript': { deps: ['shCore'] },
        'shBrushPython': { deps: ['shCore'] },
    },
});

// TODO: Add back in input-math
require( ["require", "angular", "shCore", "bootstrap", "directives/mathjax", "directives/video-player", "directives/input-math", "moment", "activity-display", "shBrushJScript"], function(require, angular, shCore) {
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
