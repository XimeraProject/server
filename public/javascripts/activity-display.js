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
define(['angular', 'jquery', 'underscore', 'algebra/math-function', 'algebra/parser', 'js-quantities', 'confirm-click', 'activity-services'], function(angular, $, _, MathFunction, parse, Quantities) {
    var app = angular.module('ximeraApp.activity', ["ngAnimate", "ximeraApp.confirmClick", "ximeraApp.activityServices"]);

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
        // Bind the $rootScope for use by services.
        stateService.bindState($rootScope, $('.activity').attr('data-activityId'), function () {
            logService.createEmptyDb();
        }).then(function () {
            logService.initialize();
        });

        $timeout(function () {
            MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
	    MathJax.Hub.Queue(["Rerender",MathJax.Hub]);
        });
    }]);


    // TODO: Save complete angular.js state to MongoDB; state is indexed by user and activity hash.
    // If activity hash is updated, for now state is thrown away.

    // Questions have multiple solutions:
    // Solutions each have 1 answer (input format may be different)
    // When answered, send result to server to be stored in MongoDB.

    // question, exercise, exploration, solution, answer, (multiple questions not blocking; multiple solutions is blocking), shuffle, hint (Get hint!)

    // Choose from among multiple problems
    app.directive('ximeraShuffle', ['$timeout', 'stateService', function ($timeout, stateService) {
        return {
            restrict: 'A',
            scope: {},
            link: function($scope, element, attrs, controller) {
                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $scope.db.historyCount = 5;
                    var possibleFirstQuestions = $(element).children('.question, .exercise, .exploration');
                    if (possibleFirstQuestions.length > 0) {
                        $scope.db.activeQuestionUuid = $(possibleFirstQuestions[Math.floor(Math.random() * possibleFirstQuestions.length)]).attr('data-uuid');
                    }
                    else {
                        $scope.db.activeQuestionUuid = null;
                    }
                    $scope.db.doneUuids = [];
                }).then(function () {
                    $(element).on("completeQuestion", function (event, data) {
                        var questionUuid = data.questionUuid;
                        $scope.db.doneUuids.push(questionUuid);
                        if ($scope.db.activeQuestionUuid === questionUuid) {
                            var questions = $(element).children('.question, .exercise, .exploration');
                            var uuids = questions.map(function() {
                                return $(this).attr('data-uuid');
                            }).get();
                            var freeUuids = _.difference(uuids, $scope.db.doneUuids);

                            if (freeUuids.length > 0) {
                                $scope.db.activeQuestionUuid = freeUuids[Math.floor(Math.random() * freeUuids.length)];
                            }
                            else {
                                $scope.db.activeQuestionUuid = null;
                            }
                        }
                    });

                    // Setup watches.
                    $scope.$watchCollection("[db.doneUuids, db.activeQuestionUuid]", function (newVals) {
                        var doneUuids = newVals[0];
                        var activeQuestionUuid = newVals[1];
                        if (!doneUuids) {
                            return;
                        }

                        // Sort by order done.
                        var sortedQuestions = _.map(doneUuids, function (uuid) {
                            return $(element).find("[data-uuid=" + uuid + "]");
                        });
                        sortedQuestions.push($(element).find("[data-uuid=" + activeQuestionUuid + "]"));
                        sortElements(sortedQuestions);

                        // Show number of previous problem given in history count, along with current problem.
                        $(element).children('.question, .exercise, .exploration').each(function (index, questionElt) {
                            var questionUuid = $(questionElt).attr('data-uuid');
                            var totalDone = doneUuids.length;

                            if ((_.contains(doneUuids, questionUuid) && ((totalDone - index) <= $scope.db.historyCount)) || (activeQuestionUuid === questionUuid)) {
                                $(questionElt).show();
                            }
                            else {
                                $(questionElt).hide();
                            }
                        });
                    }, true);
                });
            }
        };
    }]);

    app.directive('ximeraHint', ['$compile', '$timeout', 'stateService', function($compile, $timeout, stateService) {
        return {
            restrict: 'A',
            scope: {},
            template: '<div><button class="btn btn-info pull-right" ng-show="db.next" ng-click="showHint()">Show Hint</button></div>',
            replace: true,
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
                // Transclude so we can include a ghost question environment inside of hint.
                transclude(function (clone) {
                    var questionElement = $('<div class="question" ximera-question ng-show="db.shown"></div>');
                    questionElement.attr('data-uuid', $(element).attr('data-uuid') + '-question');
                    questionElement = $compile(questionElement)($scope);
                    questionElement.append(clone);
                    $(element).append(questionElement);
                });

                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $scope.db.next = false;
                    $scope.db.shown = false;
                    if ($(element).prevAll('.hint').length == 0) {
                        $scope.db.next = true;
                    }
                }).then(function () {
                    $scope.showHint = function () {
                        $scope.db.next = false;
                        $scope.db.shown = true;
                        $(element).nextAll('.hint').first().trigger('markAsNext');
                    }

                    $(element).on('markAsNext', function () {
                        $scope.db.next = true;
                    });

                    $(element).on('completeQuestion', function (event) {
                        event.stopPropagation();
                    });
                });
/*
                $scope.$watch('db.shown', function (shown) {
                    if (shown) {
                        $(element).children('.question').show();
                    }
                    else {
                        $(element).children('.question').hide();
                    }
                });*/
            }
        }
    }]);

    // For now, use this as directive function for questions, explorations, and exercises.
    var questionDirective = ['$compile', '$rootScope', '$timeout', 'logService', 'stateService', function ($compile, $rootScope, $timeout, logService, stateService) {
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

                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    var questionParts = $(element).children('.questionPart');
                    $scope.db.questionPartUuids = _.map(questionParts, function (questionPart) {
                        return $(questionPart).attr('data-uuid');
                    })
                    if (questionParts.length > 0) {
                        $scope.db.currentQuestionPart = $scope.db.questionPartUuids[0];
                    }
                    else {
                        $scope.db.currentQuestionPart = "";
                    }
                    $scope.db.doneUuids = [];
                    $scope.db.complete = false;
                }).then(function () {
                    // Which part of the question are we up to; only reveal next part after first is complete.
                    $scope.$watch('db.currentQuestionPart', function (uuid) {
                        var index = _.indexOf($scope.db.questionPartUuids, $scope.db.currentQuestionPart);
                        $(element).children('.questionPart').each(function (ii, questionPartElt) {
                            if ((index === -1) || (ii <= index)) {
                                $(questionPartElt).show();
                            }
                            else {
                                $(questionPartElt).hide();
                            }
                        });
                    });

                    // TODO: Change display when complete?
                    $(element).on('completeQuestionPart', function (event, data) {
                        if (!_.contains($scope.db.doneUuids, data.questionPartUuid)) {
                            $scope.db.doneUuids.push(data.questionPartUuid);
                        }
                        var remaining = _.difference($scope.db.questionPartUuids, $scope.db.doneUuids);
                        if (remaining.length > 0) {
                            $scope.db.currentQuestionPart = remaining[0];
                        }
                        else if (!$scope.db.complete) {
                            $scope.db.complete = true;
                            $(element).trigger('completeQuestion', {questionUuid: $(element).attr('data-uuid')});
                            $scope.db.currentQuestionPart = "";
                        }
                        logService.logCompletion(data.questionPartUuid, data.hasAnswer);
                    });
                });
            }
        }
    }]

    app.directive('ximeraQuestion', questionDirective);
    app.directive('ximeraExercise', questionDirective);
    app.directive('ximeraExploration', questionDirective)

    app.directive('ximeraQuestionPart', ['$timeout', 'logService', 'stateService', 'scoreService', function ($timeout, logService, stateService) {
        return {
            restrict: 'A',
            scope: {},
            link: function ($scope, element, attrs, controller) {
                statePromise = stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $scope.db.complete = false;
                }).then(function () {
                    $(element).on('attemptAnswer', function (event, data) {
                        var uuid = $(element).attr('data-uuid');
                        if (data.success && !$scope.db.complete) {
                            $scope.db.complete = true;
                            $(element).trigger('completeQuestionPart', {questionPartUuid: uuid, hasAnswer: true})
			    $scope.$emit( 'Xudos', 1 );
                        }
                        logService.logAnswer(uuid, data.answer, data.success);
                        event.stopPropagation();
                    });

                    // If no solution, immediately mark this question part as complete.
                    $timeout(function () {
                        if ($(element).children('.solution').length === 0) {
                            $(element).trigger('completeQuestionPart', {questionPartUuid: $(element).attr('data-uuid'), hasAnswer: false});
                        }
                    });
                });
            }
        };
    }]);

    app.directive('ximeraSolution', ['$rootScope', 'stateService', function ($rootScope, stateService) {
        return {
            restrict: 'A',
            scope: {},
            link: function($scope, element, attrs, controller) {}
        };
    }]);

    app.directive('ximeraMultipleChoice', ['$rootScope', '$sce', '$timeout', 'stateService', function ($rootScope, $sce, $timeout, stateService) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/multiple-choice',
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $scope.db.success = false;
                    $scope.db.message = "";
                    $scope.db.correctAnswer = $(element).attr('data-answer');

                    // Default to "correct" as answer so that default usage is \choice{Blahblah}{correct}
                    if ($scope.db.correctAnswer === "") {
                        $scope.db.correctAnswer = "correct";
                    }

                    $scope.db.choices = [];

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
                                uuid: $(choice).attr('data-uuid'),
                                value: value,
                                labelHtml: $(choice).html(),
                                label: ""
                            }
                        });

                        // Randomize order.
                        $scope.db.choices = _.shuffle($scope.db.choices);
                    });

                    $scope.db.radioGroup = $(element).attr('data-uuid');
                }).then(function () {
                    // Set element labels.
                    $scope.choiceLabelsByUuid = {};
                    _.each($scope.db.choices, function (choice) {
                        $scope.choiceLabelsByUuid[choice.uuid] = $sce.trustAsHtml(choice.labelHtml);
                    });
                    $timeout(function () {
                        MathJax.Hub.Queue(["Typeset", MathJax.Hub, $(element).get(0)]);
                    });

		    $scope.activate = function(value) {
		        $scope.db.radioValue = value;
		    };

                    $scope.$watch('db.radioValue', function (value) {
		        if ($scope.db.attemptedAnswer != value)
			    $scope.db.message = "";
		        else
			    $scope.db.message = $scope.db.recentMessage;
		    });

                    $scope.$watch('db.order', function (order) {
                        var sortedChoices = _.map(order, function (uuid) {
                            return $(element).find("[data-uuid=" + uuid + "]");
                        });
                        sortElements(sortedChoices);
                    }, true);

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
                                answer: $scope.db.radioValue
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
                });
            }
        };
    }]);

    app.directive('ximeraExpressionAnswer', ['popoverService', 'stateService', function(popoverService, stateService) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/math-input',
            transclude: true,
            replace: true,
            link: function($scope, element, attrs, controller, transclude) {
                transclude(function (clone) {
                    $scope.validator = $(clone).text();
                });

                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $scope.db.success = false;
                    $scope.db.answer = "";
                    $scope.db.message = "";
                    $scope.db.transcript = "";
                }).then(function () {
                    popoverService.watchFocus($scope, "focused", $(":text", element));
                    $scope.$watchCollection('[db.answer, focused]', function (coll) {
                        var answer = coll[0];
		        // If you change the answer, the question is no longer marked wrong
		        if ($scope.db.attemptedAnswer != answer) {
			    $scope.db.message = "";
                        }
		        else {
			    $scope.db.message = $scope.db.recentMessage;
                        }

                        if ($scope.db.success || !$scope.focused) {
                            popoverService.destroyPopover(element);
                        }
                        else if ($scope.focused) {
                            popoverService.latexPopover(answer, element);
                        }
                    });

                    $scope.$watch('db.transcript', function(transcript) {
                        var transcriptId = $(element).attr('data-uuid') + '-transcript';
                        var transcriptElement;
                        if ($('#' + transcriptId).length === 0) {
                            // Insert transcript element after the nearest containing paragraph.
                            transcriptElement = $('<div class="well well-sm" style="display: none; white-space: pre;"></div>');
                            transcriptElement.attr('id', transcriptId);
                            $(element).parents('p').first().after(transcriptElement);
                        }
                        else {
                            transcriptElement = $('#' + transcriptId).first();
                        }

                        if (transcript.length === 0) {
                            transcriptElement.hide();
                        }
                        else {
                            transcriptElement.text(transcript);
                            transcriptElement.show();
                        }
                    });

                    $scope.attemptAnswer = function () {
                        if ((!$scope.db.success) && ($scope.db.answer != "")) {
                            var success = false;
			    $scope.db.attemptedAnswer = $scope.db.answer;
                            var parsedAnswer = MathFunction.parse($scope.db.answer);
			    var correctAnswer = [];

                            $scope.db.transcript = ""
                            var feedback = function (text) {
                                $scope.db.transcript += text + "\n";
                            }

                            try {
				// So that js-quantities is available
				var Qty = Quantities;

                                eval($scope.validator);

				window.MathFunction = MathFunction;
				window.validator = validator;
				
                                if (validator(parsedAnswer, $scope.db.answer)) {
                                    success = true;
                                }
                            }
                            catch (err) {
                                console.log(err);
                            }

                            $(element).trigger('attemptAnswer', {
                                success: success,
                                answerUuid: $(element).attr('data-uuid'),
                                answer: $scope.db.answer
                            });

                            if (success) {
                                $scope.db.message = 'correct';
                                $scope.db.recentMessage = 'correct';
                            }
                            else {
                                $scope.db.message = 'incorrect';
                                $scope.db.recentMessage = 'incorrect';
                            }
                            $scope.db.success = success;
                        }
                    };
                });

            }
        }
    }]);

    // For now answer is just a plain text entry.
    app.directive('ximeraAnswer', ['stateService', 'popoverService', function (stateService, popoverService) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/math-input',
            transclude: true,
            replace: true,
            link: function($scope, element, attrs, controller) {
                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $scope.db.success = false;
                    $scope.db.answer = "";
                    $scope.db.correctAnswer = $(element).attr('data-answer');
                    $scope.db.message = "";
                }).then(function () {
                    popoverService.watchFocus($scope, "focused", $(":text", element));
                    $scope.$watchCollection('[db.answer, focused]', function (coll) {
                        var answer = coll[0];
		        // If you change the answer, the question is no longer marked wrong
		        if ($scope.db.attemptedAnswer != answer) {
			    $scope.db.message = "";
                        }
		        else {
			    $scope.db.message = $scope.db.recentMessage;
                        }

                        if ($scope.db.success || !$scope.focused) {
                            popoverService.destroyPopover(element);
                        }
                        else if ($scope.focused) {
                            popoverService.latexPopover(answer, element);
                        }
		    });

                    $scope.attemptAnswer = function () {
                        if ((!$scope.db.success) && ($scope.db.answer != "")) {
                            var success = false;
			    $scope.db.attemptedAnswer = $scope.db.answer;

                            var parsedAnswer = MathFunction.parse($scope.db.answer);
                            var parsedCorrect = MathFunction.parse($scope.db.correctAnswer);

			    // If the correct answer is just a number...
			    if (parsedCorrect.variables().length == 0) {
				// then the student response must also be a number.
				if (parsedAnswer.variables().length == 0) {
				    var parsedCorrectValue = parsedCorrect.evaluate({});
				    var parsedAnswerValue = parsedAnswer.evaluate({});
				    
				    // If the correct answer is an integer
				    if (parsedCorrectValue % 1 === 0) {
					// and these two numbers must be exactly the same
					if (parsedCorrectValue == parsedAnswerValue)
					    success = true;
				    } else { // but if the correct answer is just some non-integral float
					// and these two numbers must be pretty close
					if (Math.abs(parsedCorrectValue - parsedAnswerValue) < 0.000001)
					    success = true;					
				    }
				}
			    } else { // but if the correct answer involves variables
				// then the student response must be "equal" as a math expression
				if (parsedCorrect.equals(parsedAnswer))
                                    success = true;
			    }

                            $(element).trigger('attemptAnswer', {
                                success: success,
                                answerUuid: $(element).attr('data-uuid'),
                                answer: $scope.db.answer
                            });

                            if (success) {
                                $scope.db.message = 'correct';
                                $scope.db.recentMessage = 'correct';
                            }
                            else {
                                $scope.db.message = 'incorrect';
                                $scope.db.recentMessage = 'incorrect';
                            }
                            $scope.db.success = success;
                        }
                    };
                });
            }
        };
    }]);

    app.controller('ResetButtonCtrl', ['$scope', 'stateService', function ($scope, stateService) {
        $scope.resetPage = stateService.resetPage;
    }]);

    app.controller('SaveWorkCtrl', ['$scope', 'stateService', function($scope, stateService) {
        $scope.updateState = stateService.updateState;

	$scope.$on( 'persisted', function(event, args) {
	    $scope.saved = args[0];
	});
    }]);
});
