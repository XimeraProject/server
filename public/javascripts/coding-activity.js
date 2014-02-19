define(['angular', 'jquery', 'underscore', 'codemirror', 'activity-display'], function(angular, $, _, CodeMirror) {
    var app = angular.module('ximeraApp.codingActivity', ["ximeraApp.activity", 'ui.codemirror']);

    app.directive('ximeraPython', ['$compile', '$rootScope', 'stateService', function ($compile, $rootScope, stateService) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/python',
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
                // Extract python code from original.
                transclude(function (clone) {
		    $scope.scaffold = $(clone).text();

		    var options = {
			lineWrapping : true,
			lineNumbers: true,
			mode: 'python',
		    };

      		    var myCodeMirror = CodeMirror.fromTextArea($(element).find('textarea')[0], options);

		    // update model to reflect view
		    myCodeMirror.on('change', function (instance) {
			var newValue = instance.getValue();
			if ($scope.db.code != newValue) {
			    $scope.$apply(function() {
				$scope.db.code = newValue;
			    });
			}
		    });

		    // update view to reflect model
		    $scope.$watch('db.code', function (value) {
			if (value != myCodeMirror.getValue()) {
			    myCodeMirror.setValue( value );
			    myCodeMirror.refresh();
			}
		    });
		});

                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
		    $scope.db.success = false;
		    $scope.db.message = "";
		    $scope.db.code = $scope.scaffold;
                });

		$scope.activate = function(value) {
		    $scope.db.radioValue = value;
		};

                $scope.attemptAnswer = function () {
                    if (!$scope.db.success) {
                        var success = false;
                        if ($scope.db.radioValue === $scope.db.correctAnswer) {
                            success = true;
                        }

			$scope.db.attemptedAnswer = $scope.db.radioValue;

                        $(element).trigger('attemptAnswer', {
                            success: success,
                            answerUuid: $(element).attr('data-uuid'),
                            answer: $scope.db.radioValue,
                            correctAnswer: $scope.db.correctAnswer
                        });

                        if (success) {
                            $scope.db.recentMessage = $scope.db.message = "correct";
                        }
                        else {
                            $scope.db.recentMessage = $scope.db.message = "incorrect";
                        }
                        $scope.db.success = success;
                    }
                };
            }
        };
    }]);

});
