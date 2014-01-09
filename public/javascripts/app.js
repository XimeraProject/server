requirejs.config({
    baseUrl: "/public/javascripts",
    paths: {
	"jquery": "/components/jquery/jquery.min",
	"angular": "/components/angular/angular",
	"underscore": "/components/underscore/underscore-min",
	"x-editable": "/components/x-editable/dist/bootstrap-editable/js/bootstrap-editable.min",
	"domReady": "/components/requirejs-domready/domReady",
	"threejs": "/components/threejs/build/three.min",
	"moment": "/components/moment/min/moment.min",

	"pagedown-converter": "/components/pagedown-bootstrap/Markdown.Converter",
	"pagedown-sanitizer": "/components/pagedown-bootstrap/Markdown.Sanitizer",
	"pagedown-editor": "/components/pagedown-bootstrap/Markdown.Editor",

	"bootstrap": "/components/bootstrap/dist/js/bootstrap.min",

	"mathquill": "/components/mathquill/build/mathquill.min",
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
    },
});

// TODO: Add back in input-math
require( ["require", "angular", "bootstrap", "directives/mathjax", "moment", "activity-display"], function(require, angular) {
    'use strict';

    var app = angular.module('ximeraApp', ['ximeraApp.mathJax', 'ximeraApp.activity']);
    //require(['domReady!'], function (document) {
        angular.bootstrap(document, [app['name']]);
//});
});

// Load the main app module to start the app
//requirejs([

/*
    script(src="/public/javascripts/setup-editable.js")
    script(src="/public/javascripts/remote-binding.js")
    script(src="https://www.youtube.com/iframe_api")
    script(src="/public/javascripts/video-player.js")
*/
