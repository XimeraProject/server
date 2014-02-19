
/*
 * 
 * A "mathjax" element packaged as an angular directive.
 *
 */

define(['angular', 'jquery', 'underscore'], function(angular, $, _) {
    'use strict';

    angular.module('ximeraApp.mathJax', [])
	.directive('mathjax', [function() {
	    return {
		restrict: 'E', // this directive will only be used as an element
		replace: true,
		scope: {
		    ngModel: '='
		},
		template: ('<span id="popover-content"></span>'),
		
		link: function(scope, element, attrs) {
		    scope.$watch( "ngModel", function() {
			$(element).html('$' + scope.ngModel + '$');
			MathJax.Hub.Queue(["Typeset",MathJax.Hub, $(element).get(0)]);
		    });

		},
	    }
	}]);
});
