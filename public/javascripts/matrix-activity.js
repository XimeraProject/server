define(['angular', 'jquery', 'underscore', 'activity-display', 'math-matrix'], function(angular, $, _) {
    var app = angular.module('ximeraApp.matrixActivity', ["ximeraApp.activity", "ximeraApp.mathMatrix"]);
    
    // The funny capitalization results in ximera-matrixanswer in HTML
    app.directive('ximeraMatrixAnswer', ['$compile', '$rootScope', 'stateService', function ($compile, $rootScope, stateService) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/matrix-answer',
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
                transclude(function (clone) {
		    $scope.validator = $(clone).text();
		});

                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
		    $scope.db.success = false;
		    $scope.db.message = "";
                });

		$scope.activate = function(value) {
		};

                $scope.attemptAnswer = function () {
                    var success = false;

		    var validator = function(m) { return false; };
		    
		    try {
			eval($scope.validator);

			if (validator($scope.db.matrix)) {
			    success = true;
			}
		    } catch (err) {
		    	console.log( err );
		    }

		    // need to add stringified answer here
                    $(element).trigger('attemptAnswer', {
                        success: success,
                        answerUuid: $(element).attr('data-uuid'),
                        answer: "",
                        correctAnswer: ""
                    });
		    
                    if (success) {
                        $scope.db.recentMessage = $scope.db.message = "correct";
                    } else {
                        $scope.db.recentMessage = $scope.db.message = "incorrect";
                    }
		    
                    $scope.db.success = success;
                };
            }
        };
    }]);

});
