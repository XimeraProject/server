
/*
 * 
 * An "input math" element packaged as an angular directive.
 *
 */

define(['angular', 'jquery', 'underscore', 'algebra/parser', 'mathquill', 'bootstrap'], function(angular, $, _, parse) {
    'use strict';

    angular.module('ximeraApp.inputMath', [])
	.directive('mathinput', [function() {
	    return {
		restrict: 'E', // this directive will only be used as an element
		replace: true,
		scope: {
		    ngModel: '='
		},
		template: ('<form class="form-inline">' +
			   '<div class="input-group">' +
                           '<span class="mathquill-editable" ></span>' +
                           '<input type="text" class="plain form-control"/>' +
			   '<span class="input-group-btn">' +
			   '<button class="wysiwyg btn btn-default" type="button">x<sup>2</sup></button>' +
			   '<button class="plain btn btn-default"  type="button"><span style="font-family: monospace;">x^2</span></button>' +
			   '</span>' +
			   '</div>' +
			   '</form>'),

		link: function(scope, element, attrs) {
		    $('button.plain', element).click( function() {
			$('input.plain',element).show();
			$('button.plain',element).addClass('active');
			$('button.wysiwyg',element).removeClass('active');
			$('span.mathquill-editable',element).hide();
		    });

		    $('button.wysiwyg', element).click( function() {
			$('input.plain',element).hide();
			$('button.plain',element).removeClass('active');
			$('button.wysiwyg',element).addClass('active');
			$('span.mathquill-editable',element).show();
		    });

		    // Mathquill needs to be started progmatically since it wasn't present in the DOM on documentready
                    // TODO: Do we want inline-block here?
		    $('span.mathquill-editable', element).mathquill('editable').css('display', 'inline-block');

		    // default to ascii input
		    //$('button.plain', element).button('toggle');
		    //$('button.wysiwyg', element).button('toggle');
		    $('button.wysiwyg', element).click();
		    $('button.plain', element).click();

		    var update = _.debounce( function() {
			// change the attribute
			var result = parse.text.to.latex($('input.plain',element).val());
			console.log( result );
			/*
			scope.$apply( function() {
			    scope.ngModel = result;
			});
			*/
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
