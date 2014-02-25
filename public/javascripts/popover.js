define(['angular', 'jquery', 'underscore', 'algebra/parser'], function (angular, $, _, parse) {
    var app = angular.module('ximeraApp.popover', []);

    app.service('popoverService', function () {
        var service = {};

        service.watchFocus = function(container, varName, element) {
            // Start out unfocused on page load.
            container[varName] = false;
            $(element).bind('focus', function () {
                container[varName] = true;
            });

            $(element).bind('blur', function () {
                container[varName] = false;
            });
        }

        var updateMathJax = _.debounce(function () {
            MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
        }, 200);


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
                
                updateMathJax();
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
