define(['angular', 'jquery', 'algebra/parser'], function (angular, $, parse) {
    var app = angular.module('ximeraApp.popover', []);

    app.service('popoverService', function () {
        var service = {};

        service.watchFocus = function($scope, element, varName) {
            // Start out unfocused on page load.
            $scope.db[varName] = false;
            $(element).bind('focus', function () {
                $scope.db[varName] = true;
            });

            $(element).bind('blur', function () {
                $scope.db[varName] = false;
            });
        }

        // Binds latex popover occur next to element when watched variable changes.
        service.latexPopover = function(answer, element) {
	    if (answer.trim().length == 0) {
		$(element).popover('destroy');
		return;
	    }

	    try {
		var latex = parse.text.to.latex(answer);
                
		$(element).popover('destroy');
		$(element).popover({
		    placement: 'right',
		    //animation: false,
		    trigger: 'manual',
		    content: function() {
			return '$' + latex + '$';
		    }});
                
		$(element).popover('show');
                
		MathJax.Hub.Queue(["Typeset", MathJax.Hub, $(element).children(".popover-content")[0]]);
	    }
	    // display errors as popovers, too
	    catch (err) {
		$(element).popover('destroy');
		$(element).popover({
		    placement: 'right',
		    trigger: 'manual',
		    title: 'Error',
		    content: function() {
			return err;
		    }});
		$(element).popover('show');
	    }
        }

        service.destroyPopover = function(element) {
            $(element).popover('destroy');
        }

        return service;
    });
});
