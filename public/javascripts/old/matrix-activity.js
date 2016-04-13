define(['angular', 'jquery', 'underscore', 'algebra/math-function', 'activity-services', 'math-matrix'], function(angular, $, _, MathFunction) {
    var app = angular.module('ximeraApp.matrixActivity', ["ximeraApp.activityServices", "ximeraApp.mathMatrix"]);
    
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
                    $scope.db.transcript = "";
                }).then(function () {
                    $scope.$watch('db.transcript', function(transcript) {
                        var transcriptId = $(element).attr('data-uuid') + '-transcript';
                        var transcriptElement;
                        if ($('#' + transcriptId).length === 0) {
                            // Insert transcript element after the nearest containing paragraph.
                            transcriptElement = $('<div class="well well-sm" style="display: none; white-space: pre;"></div>');
                            transcriptElement.attr('id', transcriptId);
                            $(element).parents('div').first().after(transcriptElement);
                        }
                        else {
                            transcriptElement = $('#' + transcriptId).first();
                        }

                        if (transcript.length === 0) {
                            transcriptElement.hide();
                        }
                        else {
			    if (transcript)
                                transcriptElement.text(transcript);

                            transcriptElement.show();
                        }
                    });

		    $scope.activate = function(value) {
		    };

                    $scope.attemptAnswer = function () {
                        var success = false;

		        var correctMatrix = [];

		        $scope.db.transcript = ""
                        var feedback = function (text) {
                            $scope.db.transcript += text + "\n";
                        };

		        var rows = function(m) {
			    return m.length;
		        };

		        var columns = function(m) {
			    return m[0].length;
		        };

		        var isNotColumnVector = function(m, desiredDimension) {
			    if (columns(m) != 1) {
			        feedback('This should be a column vector.');
			        return true;
			    }

			    if (rows(m) != desiredDimension) {
			        feedback('This should be a column vector with ' + desiredDimension.toString() + ' entries.');
			        return true;
			    }

			    return false;
		        };

		        var isWrongSize = function(m, desiredRows, desiredColumns) {
			    if ((columns(m) == desiredRows)  && (rows(m) == desiredColumns) && (desiredRows != desiredColumns)) {
			        feedback('Your answer should be ' + desiredRows.toString() + ' by ' + desiredColumns.toString() + ' instead of the other way around.');  
			        return true;
			    }

			    if (rows(m) != desiredRows) {
			        feedback('Your answer should have ' + desiredRows.toString() + ' rows.');
			    }

			    if (columns(m) != desiredColumns) {
			        feedback('Your answer should have ' + desiredColumns.toString() + ' columns.');
			    }

			    if ((rows(m) != desiredRows) || (columns(m) != desiredColumns)) {
			        return true;
			    }

			    return false;
		        };

		        var matrixProduct = function(a, b) {
			    if (columns(a) != rows(b))
			        return false;

			    var m = [];

			    var i;
			    for( i=0; i<rows(a); i++ ) {
			        m[i] = [];
			        var j;
			        for( j=0; j<columns(b); j++ ) {
				    var k;
				    m[i][j] = "0";
				    for( k=0; k<columns(a); k++ )
				        m[i][j] = m[i][j] + '+ ((' + a[i][k] + ')*(' + b[k][j] + '))';
			        }
			    }
			
			    return m;
		        };

			var unpackMatrix = function(m) {
			    var result = [];

			    var i;
			    for( i=0; i<rows(m); i++ ) {
			        result[i] = [];
			        var j;
			        for( j=0; j<columns(m); j++ ) {
				    result[i][j] = m[i][j].v;			    
				}
			    }

			    return result;
			}

		        var isMatrixCorrect = function(m, answer) {
			    if (columns(answer) == 1)
			        if (isNotColumnVector(m, rows(answer))) return false;

			    if (isWrongSize(m, rows(answer), columns(answer) )) return false;

			    var i;
			    for( i=0; i<rows(answer); i++ ) {
			        var j;
			        for( j=0; j<columns(answer); j++ ) {
				    var parsedAnswer = MathFunction.parse(answer[i][j]);
				    var parsedResponse = MathFunction.parse(m[i][j]);
				    if (!(parsedResponse.equals(parsedAnswer))) {
				        feedback('The entry in row ' + (i+1).toString() + ' and column ' + (j+1).toString() + ' differs.'); 
				        return false;
				    }
			        }
			    }

			    return true;
		        };

		        var validator = function(m) { return isMatrixCorrect(unpackMatrix(m), correctMatrix); };

		        try {
			    eval($scope.validator);
			    console.log( 'correctMatrix', correctMatrix );
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
                });
            }
        };
    }]);

});
