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

	'syntaxhighlighter': '/components/syntaxhighlighter/scripts/shCore',
	'syntaxhighlighter-javascript': '/components/syntaxhighlighter/scripts/shBrushJScript',
	'syntaxhighlighter-python': '/components/syntaxhighlighter/scripts/shBrushPython',
	'syntaxhighlighter-latex': '/components/syntaxhighlighter/scripts/shCore',
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

        'syntaxhighlighter-latex': { deps: ['syntaxhighlighter'] },
        'syntaxhighlighter-python': { deps: ['syntaxhighlighter'] },
        'syntaxhighlighter-javascript': { deps: ['syntaxhighlighter'] },
    },
});

// TODO: Add back in input-math
require( ["require", "angular", "bootstrap", "directives/mathjax", "directives/video-player", "directives/input-math", "moment", "activity-display"], function(require, angular) {
    'use strict';

    var app = angular.module('ximeraApp', ['ximeraApp.mathJax', 'ximeraApp.activity', 'ximeraApp.inputMath', 'ximeraApp.videoPlayer']);
    $(document).ready(function() {
        angular.bootstrap(document, [app['name']]);
    });
});

/*
    script(src="/public/javascripts/setup-editable.js")
    script(src="/public/javascripts/remote-binding.js")
    script(src="https://www.youtube.com/iframe_api")
    script(src="/public/javascripts/video-player.js")
*/
