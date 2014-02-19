define(['angular', 'jquery', 'underscore', 'codemirror', 'skulpt', 'skulpt-stdlib', 'activity-display'], function(angular, $, _, CodeMirror, Sk) {
    var app = angular.module('ximeraApp.codingActivity', ["ximeraApp.activity"]);

    app.directive('ximeraPython', ['$compile', '$rootScope', 'stateService', function ($compile, $rootScope, stateService) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/python',
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
                // Extract python code from original.
                transclude(function (clone) {
		    var source = $(clone).text();

		    $scope.scaffold = source.split("def validator():\n")[0];
		    $scope.scaffold = $scope.scaffold.replace(/^\n+|\n+$/gm,'') + "\n";

		    $scope.validator = "def validator():\n" + source.split("def validator():\n")[1];

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

                $scope.runCode = function () {
		    function outf(text) {
			var mypre = document.getElementById("output");
			mypre.innerHTML = mypre.innerHTML + text;
		    }

		    function builtinRead(x) {
			if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
			    throw "File not found: '" + x + "'";
			return Sk.builtinFiles["files"][x];
		    }
		    
		    var prog = $scope.db.code;
		    var mypre = document.getElementById("output");
		    mypre.innerHTML = '';
		    Sk.canvas = "mycanvas";
		    Sk.pre = "output";
		    Sk.configure({output:outf, read:builtinRead});
		    Sk.execLimit = 5000;

		    try {
			var module = Sk.importMainWithBody("<stdin>", false, prog);
			eval(module);
		    } catch (e) {
			$(mypre).text( e );
		    }
		};

		$scope.$watch('db.code', function (value) {
		    if ($scope.db.attemptedAnswer != value)
			$scope.db.message = "";
		    else
			$scope.db.message = $scope.db.recentMessage;
		});

                $scope.attemptAnswer = function () {
                    var success = false;

		    var outf = function(text) {};

		    var builtinRead = function(x) {
			if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
			    throw "File not found: '" + x + "'";
			return Sk.builtinFiles["files"][x];
		    }

		    Sk.configure({output:outf, read:builtinRead});
		    Sk.execLimit = 5000;
		    var prog = $scope.db.code + $scope.validator;

		    $scope.db.attemptedAnswer = $scope.db.code;

		    try {
			var module = Sk.importMainWithBody("<stdin>", false, prog);
			var validator = module.tp$getattr('validator');
			var ret = Sk.misceval.callsim(validator);
		    
			if (ret.v) {
			    success = true;
			}
		    } catch (err) {
			success = false;
		    }
		    
                    $(element).trigger('attemptAnswer', {
                        success: success,
                        answerUuid: $(element).attr('data-uuid'),
                        answer: $scope.db.code,
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
