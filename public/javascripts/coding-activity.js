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
		    
		    // Here's everything you need to run a python program in skulpt
		    // grab the code from your textarea
		    // get a reference to your pre element for output
		    // configure the output function
		    // call Sk.importMainWithBody()
		    var prog = $scope.db.code;
		    var mypre = document.getElementById("output");
		    mypre.innerHTML = '';
		    Sk.canvas = "mycanvas";
		    Sk.pre = "output";
		    Sk.configure({output:outf, read:builtinRead});
		    Sk.execLimit = 5000;

		    try {
			var module = Sk.importMainWithBody("<stdin>", false, prog);
			//var obj = module.tp$getattr('a');
			//var runMethod = obj.tp$getattr('run');
			//var ret = Sk.misceval.callsim(module, 10);
			eval(module);
			//alert(ret.v);
		    } catch (e) {
			$(mypre).text( e );
		    }
		    
		    //eval(Sk.importMainWithBody("<stdin>",false,prog));
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
