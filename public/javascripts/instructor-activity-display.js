/*
   Event names:
        attemptAnswer - Whenever an answer-type element has been attempted by the user.
            {
                success: Was the answer correct
                answerUuid: Uuid of the answer element
                answer: Text representation of user's answer
                correctAnswer: The complete correct answer
            }
        completeSolution - Whenever a question part is completed.
            {solutionUuid: Uuid of the solution element}
        completeQuestion - Whenever all parts of a question are completed.
            {questionUuid: Uuid of the question/exploration/exercise element}
*/

// Script expects data-activityId attribute in activity div.
define(['angular', 'jquery', 'underscore', 'algebra/math-function', 'algebra/parser', 'confirm-click'], function(angular, $, _, MathFunction, parse) {
    var app = angular.module('ximeraApp.instructorActivity', ["ngAnimate", "ximeraApp.confirmClick", 'ximeraApp.activityServices']);

    // Make sure a list of DOM elements is sorted in the same order in the DOM itself.
    function sortElements(elements) {
        var last = null;
        _.each(elements, function (element) {
            if (last) {
                $(element).insertAfter(last);
            }
            last = element;
        });
    }

    app.controller('ActivityController', ["$rootScope", "$timeout", "logService", "stateService", function ($rootScope, $timeout, logService, stateService) {
        $timeout(function () {
            MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
        });
    }]);

    app.service('analyticService', ['$http', '$q', '$timeout', function ($http, $q, $timeout) {
        var service = {};

        var getWithDeferred = function(activityId, deferred) {
            $http.get('/instructor/activity-analytics/' + activityId).
                success(function (data) {
                    deferred.resolve(data);
                }).
                error(function () {
                    // Retry until successful.
                    $timeout(function () {
                        getWithDeferred(activityId, deferred);
                    }, 50);
                });
        };

        var getAnalyticsForActivity = function (activityId) {
            var deferred = $q.defer();
            getWithDeferred(activityId, deferred);
            return deferred.promise;
        }

        service.onAnalytics = getAnalyticsForActivity($('.activity').attr('data-activityId'));

        return service;
    }]);

    // TODO: Save complete angular.js state to MongoDB; state is indexed by user and activity hash.
    // If activity hash is updated, for now state is thrown away.

    // Questions have multiple solutions:
    // Solutions each have 1 answer (input format may be different)
    // When answered, send result to server to be stored in MongoDB.

    // question, exercise, exploration, solution, answer, (multiple questions not blocking; multiple solutions is blocking), shuffle, hint (Get hint!)

    // Choose from among multiple problems
    app.directive('ximeraShuffle', ['$timeout', function ($timeout) {
        return {
            restrict: 'A',
            scope: {},
            link: function($scope, element, attrs, controller) {
                $(element).children('.question, .exercise, .exploration').each(function (index, questionElt) {
                    $(questionElt).show();
                });
            }
        };
    }]);

    app.directive('ximeraHint', ['$compile', '$timeout', function($compile, $timeout) {
        return {
            restrict: 'A',
            scope: {},
            template: '<div></div>',
            replace: true,
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
                // Transclude so we can include a ghost question environment inside of hint.
                transclude(function (clone) {
                    var questionElement = $('<div class="question" ximera-question></div>');
                    questionElement.attr('data-uuid', $(element).attr('data-uuid') + '-question');
                    questionElement = $compile(questionElement)($scope);
                    questionElement.append(clone);
                    $(element).append(questionElement);
                });
            }
        }
    }]);

    // For now, use this as directive function for questions, explorations, and exercises.
    var questionDirective = ['$compile', '$rootScope', '$timeout', function ($compile, $rootScope, $timeout) {
        return {
            restrict: 'A',
            scope: {},
            template: '<div></div>',
            replace: true,
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
                // We dynamically copy in content so we can introduce ghost "question part" directives for each solution.
                transclude(function (clone) {
                    var locals = {};
                    locals.currentQuestionPartElements = [];
                    locals.questionParts = [locals.currentQuestionPartElements];
                    _.each($(clone), function (subElement) {
                        locals.currentQuestionPartElements.push(subElement);
                        if ($(subElement).hasClass('solution')) {
                            locals.currentQuestionPartElements = [];
                            locals.questionParts.push(locals.currentQuestionPartElements);
                        }
                        else {
                        }
                    });
                    locals.count = 0;
                    _.each(locals.questionParts, function (elementList) {
                        if (elementList.length === 0) {
                            return;
                        }

                        // Create question part directive to contain elements.
                        // Need to have consistent unique ids across loads.
                        var uniqueId = 'ximera-question-part-' + $(element).attr('data-uuid') + '-' + locals.count.toString();
                        locals.count += 1;
                        var questionPartElement = $('<div class="questionPart" ximera-question-part></div>').attr('data-uuid', uniqueId);
                        questionPartElement = $compile(questionPartElement)($scope);

                        _.each(elementList, function (subElement) {
                            $(questionPartElement).append(subElement);
                        });
                        $(element).append(questionPartElement);
                    });
                });
            }
        }
    }]

    app.directive('ximeraQuestion', questionDirective);
    app.directive('ximeraExercise', questionDirective);
    app.directive('ximeraExploration', questionDirective)

    app.directive('ximeraQuestionPart', ['$compile', '$timeout', function ($compile, $timeout) {
        return {
            restrict: 'A',
            replace: true,
            transclude: true,
            template: '<div class="row well"><div class="col-md-6"></div><div class="col-md-6"></div></div>',
            scope: {},
            link: function ($scope, element, attrs, controller, transclude) {
                $timeout(function () {
                    // Move content from end of directive into appropriate column.
                    var answerAnalysisElement = $('<div></div>');
                    answerAnalysisElement.attr('ximera-answer-analysis', 'true');
                    answerAnalysisElement.attr('analysis-uuid', 'db.analysisUuid');
                    var answerAnalysis = $compile(answerAnalysisElement)($scope);
                    $(element).children('.col-md-6').eq(1).append(answerAnalysis);

                    var content = $(element).children('.col-md-6').eq(1).nextAll();
                    content.detach().appendTo($(element).children('.col-md-6').eq(0));

                    $scope.db = {};
                    if ($(element).find('.solution').length !== 0) {
                        $scope.db.analysisUuid = $(element).attr('data-uuid');
                    }
                });
            }
        };
    }]);

    app.directive('ximeraAnswerAnalysis', ['$compile', '$timeout', 'analyticService', function ($compile, $timeout, analyticService) {
        return {
            restrict: 'A',
            replace: true,
            transclude: true,
            templateUrl: '/template/answer-analysis',
            scope: {analysisUuid: '=analysisUuid'},
            link: function ($scope, element, attrs, controller) {
                $timeout(function () {
                    analyticService.onAnalytics.then(function (analytics) {
                        $scope.db = {};
                        if ($scope.analysisUuid) {
                            if ($scope.analysisUuid in analytics.answerAnalyticsByUuid) {
                                $scope.db.answerAnalytics = analytics.answerAnalyticsByUuid[$scope.analysisUuid];
                                $scope.db.shown = true;
                            }
                            else {
                                $(element).text('No analytics found for answer uuid.');
                                $scope.db.shown = true;
                            }
                        }
                    });
                });
            }
        };
    }]);

    app.directive('ximeraSolution', ['$rootScope', function ($rootScope) {
        return {
            restrict: 'A',
            scope: {},
            link: function($scope, element, attrs, controller) {}
        };
    }]);

    app.directive('ximeraMultipleChoice', ['$rootScope', '$sce', function ($rootScope, $sce) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/multiple-choice',
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
                $scope.db = {};
                $scope.db.correctAnswer = $(element).attr('data-answer');

                if ($scope.db.correctAnswer === "") {
                    $scope.db.correctAnswer = "correct";
                }

                // Extract choice content from original.
                transclude(function (clone) {
                    var choiceElements = $(clone).children('.choice');
                    $scope.db.choices = _.map(choiceElements, function (choice) {
                        var value = $(choice).attr('data-value');
                        if (value === "") {
                            // Generate a random value; all options must have distinct values.
                            value = _.random(0, 1000000000).toString();
                        }
                        return {
                            value: value,
                            label: $sce.trustAsHtml($(choice).html())
                        }
                    });

                    $scope.db.radioGroup = $(element).attr('data-uuid');
                });
            }
        };
    }]);

    app.directive('ximeraExpressionAnswer', [function() {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/math-input',
            transclude: true,
            replace: true,
            link: function($scope, element, attrs, controller, transclude) {
            }
        }
    }]);

    // For now answer is just a plain text entry.
    app.directive('ximeraAnswer', [function () {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/math-input',
            transclude: true,
            replace: true,
            link: function($scope, element, attrs, controller) {
            }
        };
    }]);

    app.directive('ximeraPython', ['$compile', '$rootScope', '$timeout', function ($compile, $rootScope, $timeout) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/python',
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
                transclude(function (clone) {
                    var source = $(clone).text();

		    $scope.scaffold = source.split("def validator():\n")[0];
		    $scope.scaffold = $scope.scaffold.replace(/^\n+|\n+$/gm,'') + "\n";
                });

		var options = {
		    lineWrapping : true,
		    lineNumbers: true,
		    mode: 'python'
		};
      		var myCodeMirror = CodeMirror.fromTextArea($(element).find('textarea')[0], options);
                myCodeMirror.setValue($scope.scaffold);
                myCodeMirror.refresh();
            }
        };
    }]);

    app.directive('ximeraFreeResponse', ['$compile', '$rootScope', function ($compile, $rootScope) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/free-response',
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
		$scope.wmdName = "-" + $(element).attr('data-uuid');

		var form = $('<form class="compose">' +
			     '<div class="wmd-panel">' +
			     '<div id="wmd-button-bar' + $scope.wmdName + '"></div>' +
			     '<textarea class="content form-control" ng-model="db.response" rows="5" id="wmd-input' + $scope.wmdName + '" name="content"/>' +
			     '<div id="wmd-preview' + $scope.wmdName + '" class="wmd-panel wmd-preview"></div>' +
			     '</div>' +
			     '</form>');
		$(element).append( form );

		var textarea = $('textarea',element);

		var converter = Markdown.getSanitizingConverter();
		var editor = new Markdown.Editor(converter, $scope.wmdName);

		editor.run();

		var toolbar = $('#wmd-button-row' + $scope.wmdName, form);
		toolbar.append( $('<div class="btn-group"><button class="btn btn-primary"><i class="fa fa-share"></i>&nbsp;Submit to Peers</button><button class="btn btn-warning"><i class="fa fa-thumbs-up"></i>&nbsp;Review Peers</button></div>') );
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
		$scope.matrix = $scope.matrix || [[{v:''}]];
	    },

            link: function($scope, element, attrs, controller, transclude) {
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


    app.directive('ximeraMatrixAnswer', ['$compile', '$rootScope', function ($compile, $rootScope) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/matrix-answer',
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
            }
        };
    }]);

    app.controller('ResetButtonCtrl', ['$scope', 'stateService', function ($scope, stateService) {
        $scope.resetPage = stateService.resetPage;
    }]);

});
