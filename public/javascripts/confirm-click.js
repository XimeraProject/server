define(['angular', 'jquery', 'underscore'], function(angular, $, _) {
    var app = angular.module('ximeraApp.confirmClick', []);

    ////////////////////////////////////////////////////////////////
    // present the user a dialog box and optionally stop propagation of ng-click 
    app.directive('ngConfirmClick', [
	function(){
	    return {
		priority: -100,  
		restrict: 'A',
		link: function(scope, element, attrs){
		    element.bind('click', function(e){
			var message = attrs.ngConfirmClick;
			if(message && !confirm(message)){
			    e.stopImmediatePropagation();
			    e.preventDefault();
			}
		    });
		}
	    }
	}
    ]);
});
