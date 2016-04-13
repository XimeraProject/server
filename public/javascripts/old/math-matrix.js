define(['angular', 'jquery', 'underscore', 'algebra/parser'], function(angular, $, _, parse) {
    var app = angular.module('ximeraApp.mathMatrix', []);

    app.directive('latexPopover', ['$compile', '$rootScope', function ($compile, $rootScope) {
        return {
            restrict: 'A',
            scope: {},
            transclude: false,
            link: function($scope, element, attrs, controller) {
		element.bind('blur', function(event) {
		    $(element).popover('destroy');
		});

		var preview = function(event) {
		    var answer = $(element).val();

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
		};

		element.bind('focus', preview );

		$(element).on('input', preview );
	    }
	};
    }]);

    // The funny capitalization results in ximera-matrixanswer in HTML
    app.directive('mathMatrix', ['$compile', '$rootScope', function ($compile, $rootScope) {
        return {
            restrict: 'A',
            scope: {
		matrix: '=',
		name: '=?'
            },
            templateUrl: '/template/math-matrix',
            transclude: true,

	    controller: function($scope){
		// check if it was defined.  If not - set a default
		$scope.matrix = $scope.matrix || [[{v:''}]];

		// Need to reset the matrix if something happens to it
		if (!($scope.matrix instanceof Array)) {
		    $scope.matrix = [[{v:''}]];
		} else {
		    if ($scope.matrix.length == 0) {
			$scope.matrix = [[{v:''}]];
		    }

		    if (!($scope.matrix[0] instanceof Array)) {
			$scope.matrix = [[{v:''}]];
		    } else {
			if ($scope.matrix[0].length == 0) {
			    $scope.matrix = [[{v:''}]];
			}
		    }
		}
	    },

            link: function($scope, element, attrs, controller, transclude) {
		// check if it was defined.  If not - set a default
		$scope.matrix = $scope.matrix || [[{v:''}]];

		$scope.removeRow = function () {
		    $scope.matrix.pop();
		    return true;
		};

		$scope.addRow = function () {
		    $scope.matrix.push( _.map( $scope.matrix[0], function(x) { return {v:''}; } ) );
		    return true;
		};

		$scope.removeColumn = function () {
		    $scope.matrix = _.map($scope.matrix, _.initial);
		    return true;
		};

		$scope.addColumn = function () {
		    _.each($scope.matrix, function(row) { return row.push({v:''}); });
		    return true;
		};

		$scope.subscriptLabel = function (row,column) {
		    var numerals = ['\u2081','\u2082','\u2083','\u2084','\u2085','\u2086','\u2087','\u2088','\u2089'];
		    var name = $scope.name || 'M';

		    if (($scope.matrix.length == 1) && (column >= 0) && (column < 9))
			return name + numerals[column];

		    if (($scope.matrix[0].length == 1) && (row >= 0) && (row < 9))
			return name + numerals[row];

		    if ((row >= 0) && (row < 9) && (column >= 0) && (column < 9))
			return name + numerals[row] + numerals[column];

		    return "";
		};

		return;
            }
        };
    }]);

});
