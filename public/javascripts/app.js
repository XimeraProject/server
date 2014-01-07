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

	"bootstrap-affix": "/components/bootstrap/js/bootstrap-affix",
	"bootstrap-alert": "/components/bootstrap/js/bootstrap-alert",
	"bootstrap-button": "/components/bootstrap/js/bootstrap-button",
	"bootstrap-carousel": "/components/bootstrap/js/bootstrap-carousel",
	"bootstrap-collapse": "/components/bootstrap/js/bootstrap-collapse",
	"bootstrap-dropdown": "/components/bootstrap/js/bootstrap-dropdown",
	"bootstrap-modal": "/components/bootstrap/js/bootstrap-modal",
	"bootstrap-scrollspy": "/components/bootstrap/js/bootstrap-scrollspy",
	"bootstrap-tab": "/components/bootstrap/js/bootstrap-tab",
	"bootstrap-tooltip": "/components/bootstrap/js/bootstrap-tooltip",
	"bootstrap-transition": "/components/bootstrap/js/bootstrap-transition",
	"bootstrap-typeahead": "/components/bootstrap/js/bootstrap-typeahead",

	"mathquill": "/components/mathquill/build/mathquill.min",
    },

    priority: [
	"angular"
    ],

    shim: {
	underscore: { exports: '_' },
	angular: { exports: 'angular', deps: ['jquery'] },
	jquery: { exports: 'jQuery' },
	"bootstrap-affix": { deps: ['jquery'] },
	"bootstrap-alert": { deps: ['jquery'] },
	"bootstrap-button": { deps: ['jquery'] },
	"bootstrap-carousel": { deps: ['jquery'] },
	"bootstrap-collapse": { deps: ['jquery'] },
	"bootstrap-dropdown": { deps: ['jquery'] },
	"bootstrap-modal": { deps: ['jquery'] },
	"bootstrap-scrollspy": { deps: ['jquery'] },
	"bootstrap-tab": { deps: ['jquery'] },
	"bootstrap-tooltip": { deps: ['jquery'] },
	"bootstrap-transition": { deps: ['jquery'] },
	"bootstrap-typeahead": { deps: ['jquery'] },

	"pagedown-converter": { deps: ['bootstrap'] },
	"pagedown-sanitizer": { deps: ['bootstrap'] },
	"pagedown-editor": { deps: ['bootstrap'] },

	"mathquill": { deps: ['jquery'] },
    },
});

// TODO: Add bootstrap back in.
// TODO: Add back in input-math
require( ["require", "angular", "directives/mathjax", "moment", "activity-display"], function(require, angular) {
    'use strict';

    var app = angular.module('ximeraApp', ['ximeraApp.mathJax', 'ximeraApp.activity']);
    require(['domReady!'], function (document) {
        angular.bootstrap(document, [app['name']]);
    });
});

// Load the main app module to start the app
//requirejs([

/*
    script(src="/public/javascripts/setup-editable.js")
    script(src="/public/javascripts/remote-binding.js")
    script(src="https://www.youtube.com/iframe_api")
    script(src="/public/javascripts/video-player.js")
*/
