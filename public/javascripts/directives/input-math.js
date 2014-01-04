
/*
 * 
 * An "input math" element packaged as an angular directive.
 *
 */

define(['angular', 'jquery', 'underscore', 'parser/parser', 'mathquill', 'bootstrap'], function(angular, $, _, parse) {
    'use strict';

    angular.module('gratisuApp.inputMath', [])
	.directive('mathinput', [function() {
	    return {
		restrict: 'E', // this directive will only be used as an element
		replace: true,
		scope: {
		    ngModel: '='
		},
		template: ('<form class="form-inline">' +
			   '<div class="input-append" data-toggle="buttons-radio">' +
			   '<input class="plain" type="text"/>' +
			   '<span class="mathquill-editable"></span>' +
			   '<button class="wysiwyg btn" type="button">x<sup>2</sup></button>' +
			   '<button class="plain btn" type="button"><span style="font-family: monospace;">x^2</span></button>' +
			   '</div>' + 
			   '<div class="preview"></div>' +
			   '</form>'),
		
		link: function(scope, element, attrs) {
		    $('button.plain', element).click( function() {
			$('input.plain',element).show();
			$('span.mathquill-editable',element).hide();
		    });

		    $('button.wysiwyg', element).click( function() {
			$('input.plain',element).hide();
			$('span.mathquill-editable',element).show();
		    });
		    
		    // default to ascii input
		    $('button.plain', element).button('toggle');
		    $('button.plain', element).click();

		    var update = _.debounce( function() {
			// change the attribute
			var result = parse.text.to.latex($('input.plain',element).val());
			console.log( result );

			scope.$apply( function() {
			    scope.ngModel = result;
			});
		    }, 30 );

		    //$(document).keyup( update );
		    
		    $('input.plain',element).keyup( update );
		    $('input.plain',element).change( update );

		    // change the attribute
		    //attrs.$set('ngModel', 'new value');
		},
	    }
	}]);
});
