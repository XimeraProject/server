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
define(['angular', 'jquery', 'underscore'], function(angular, $, _) {
    var app = angular.module('ximeraApp.activity', []);

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

    app.controller('ActivityController', ["$timeout", function ($timeout) {
        // Show activity after components have had a chance to load.
        $timeout(function () {
            $('.activity').show();
        });
    }]);

    app.factory('answerService', ['stateService', function (stateService) {
        var answerService = {};
        var callbacksByAnswerUuid = {};

        answerService.attemptAnswerFor = function(answerElement, answer) {
            // TODO: Log to MongoDB
            var success = false;
            if (answer === $(answerElement).attr('data-answer')) {
                success = true;
            }
            var answerUuid = $(answerElement).attr('data-uuid');
            if (answerUuid in callbacksByAnswerUuid) {
                _.each(callbacksByAnswerUuid[answerUuid], function (callback) {
                    callback(success, answer, answerUuid);
                });
            }
            return success;
        };

        answerService.registerForAnswers = function(element, callback) {
            $(element).find('.answer').each(function (index, answerElt) {
                var answerUuid = $(answerElt).attr('data-uuid');
                if (answerUuid in callbacksByAnswerUuid) {
                    callbacksByAnswerUuid[answerUuid].push(callback);
                }
                else {
                    callbacksByAnswerUuid[answerUuid] = [callback];
                }
            });
        };

        return answerService;
    }]);

    app.factory('questionService', function () {
        // Question completion callbacks.
        var callbacksByQuestionUuid = {};
        var questionService = {};

        questionService.completeQuestion = function(question) {
            var questionUuid = $(question).attr('data-uuid');
            if (questionUuid in callbacksByQuestionUuid) {
                _.each(callbacksByQuestionUuid[questionUuid], function (callback) {
                    callback(questionUuid);
                });
            }
        };

        questionService.registerForQuestions = function(element, callback) {
            $(element).find('.question, .exercise, .exploration').each(function (index, questionElt) {
                var questionUuid = $(questionElt).attr('data-uuid');
                if (questionUuid in callbacksByQuestionUuid) {
                    callbacksByQuestionUuid[questionUuid].push(callback);
                }
                else {
                    callbacksByQuestionUuid[questionUuid] = [callback];
                }
            });        
        };

        return questionService;
    });

    app.factory('stateService', function ($timeout, $rootScope, $http) {
        var dataByUuid = {};
        var activityId = $('.activity').attr('data-activityId');

        $http.get("/angular-state/" + activityId).
            success(function (data) {
                if (data) {
                    for (var uuid in data) {
                        if (uuid in dataByUuid) {
                            // Replace contents.
                            var oldData = dataByUuid[uuid];
                            for (var prop in oldData) {
                                if (oldData.hasOwnProperty(prop)) {
                                    delete oldData[prop];
                                }
                            }
                            for (var prop in data[uuid]) {
                                if (data[uuid].hasOwnProperty(prop)) {
                                    oldData[prop] = data[uuid][prop]
                                }
                            }
                        }
                        else {
                            dataByUuid[uuid] = data[uuid];
                        }
                    }
                    console.log( "Downloaded state ", dataByUuid );
                }
            });

        // TODO: Add activityHash
        var updateState = function (callback) {
            $http.put("/angular-state/" + activityId, {dataByUuid: dataByUuid})
                .success(function(data, status, headers, config) {
                    console.log("State uploaded.");
                    if (callback) {
                        callback();
                    }
                }).error(function(data, status, headers, config) {
                    console.log("Error uploading state: ", status);
                });       
        }

        var stateService = {};
        stateService.bindState = function ($scope, uuid, initCallback) {
            if (uuid in dataByUuid) {
                $scope.db = dataByUuid[uuid];
            }
            else {
                $scope.db = {}
                dataByUuid[uuid] = $scope.db;
                initCallback();
            }

            var update = _.debounce( function() {
                console.log( "Updating ", $scope.db );
                updateState();
            }, 1000);        

            $scope.$watch("db", update, true);
        }

        stateService.resetPage = function () {
            dataByUuid = {};
            updateState(function () {
                location.reload(true);
            })
        }

        stateService.getDataByUuid = function (uuid) {
            return dataByUuid[uuid];
        }

        return stateService;
    });

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
                    $timeout(function () {
                        $scope.db.historyCount = 5;
                        var possibleFirstQuestions = $(element).find('.question, .exercise, .exploration');
                        
                        if (possibleFirstQuestions.length > 0) {
                            $scope.db.activeQuestionUuid = $(possibleFirstQuestions[Math.floor(Math.random() * possibleFirstQuestions.length)]).attr('data-uuid');                        
                        }
                        else {
                            $scope.db.activeQuestionUuid = null;
                        }
                        $scope.db.doneUuids = [];
                    });
                });

                $(element).on("completeQuestion", function (event, data) {
                    var questionUuid = data.questionUuid;
                    $scope.db.doneUuids.push(questionUuid);
                    if ($scope.db.activeQuestionUuid === questionUuid) {
                        var questions = $(element).find('.question, .exercise, .exploration');
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
                    $(element).find('.question, .exercise, .exploration').each(function (index, questionElt) {
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

                
            }
        };
    }]);

    // For now, use this as directive function for questions, explorations, and exercises.
    var questionDirective = ['$rootScope', '$timeout', 'stateService', function ($rootScope, $timeout, stateService) {
        return {
            restrict: 'A',
            scope: {},
            link: function($scope, element, attrs, controller) {
                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $timeout(function () {
                        var solutions = $(element).find('.solution');
                        $scope.db.solutionUuids = _.map(solutions, function (solution) {
                            return $(solution).attr('data-uuid');
                        })
                        if (solutions.length > 0) {
                            $scope.db.currentSolution = $scope.db.solutionUuids[0];
                        }
                        else {
                            $scope.db.currentSolution = "";
                        }
                        $scope.db.complete = false;
                    });
                });

                // Which part of the question are we up to; only reveal next part after first is complete.
                $scope.$watch('db.currentSolution', function (uuid) {
                    var index = _.indexOf($scope.db.solutionUuids, $scope.db.currentSolution);
                    $(element).find('.solution').each(function (ii, solutionElt) {
                        if ((index === -1) || (ii <= index)) {
                            $(solutionElt).show();
                        }
                        else {
                            $(solutionElt).hide();
                        }
                    });
                });

                // TODO: Change display when complete?
                $(element).on('completeSolution', function (event, data) {
                    if (data.solutionUuid === $scope.db.currentSolution) {
                        var index = _.indexOf($scope.db.solutionUuids, $scope.db.currentSolution);
                        if ($scope.db.solutionUuids.length > (index + 1)) {
                            $scope.db.currentSolution = $scope.db.solutionUuids[index + 1];
                        }
                        else {
                            $scope.db.currentSolution = "";
                            if (!$scope.db.complete) {
                                $scope.db.complete = true;
                                $(element).trigger('completeQuestion', {questionUuid: $(element).attr('data-uuid')});
                            }
                        }
                    }
                });
            }
        }
    }]

    app.directive('ximeraQuestion', questionDirective);
    app.directive('ximeraExercise', questionDirective);
    app.directive('ximeraExploration', questionDirective)

    app.directive('ximeraSolution', ['$rootScope', 'stateService', function ($rootScope, stateService) {
        return {
            restrict: 'A',
            scope: {},
            link: function($scope, element, attrs, controller) {
                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $scope.db.complete = false;
                });

                $(element).on('attemptAnswer', function (event, data) {
                    if (data.success && !$scope.db.complete) {
                        $scope.db.complete = true;
                        $(element).trigger('completeSolution', {solutionUuid: $(element).attr('data-uuid')});                        
                    }
                });
            }
        };
    }]);

    app.directive('ximeraMultipleChoice', ['$rootScope', 'stateService', function ($rootScope, stateService) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/ximera-multiple-choice',
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

                    // Extract choice content from original.
                    transclude(function (clone) {
                        var choiceElements = $(clone).filter('.choice');
                        $scope.db.choices = _.map(choiceElements, function (choice) {
                            var value = $(choice).attr('data-value');
                            if (value === "") {
                                // Generate a random value; all options must have distinct values.
                                value = _.random(0, 1000000000).toString();
                            }
                            return {
                                value: value,
                                label: $(choice).text(),
                            }
                        });

                        // Randomize order.
                        $scope.db.choices = _.shuffle($scope.db.choices);                       
                    });

                    $scope.db.radioGroup = $(element).attr('data-uuid');                        
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

                        $(element).trigger('attemptAnswer', {
                            success: success,
                            answerUuid: $(element).attr('data-uuid'),
                            answer: $scope.db.radioValue,
                            correctAnswer: $scope.db.correctAnswer
                        });

                        if (success) {
                            $scope.db.message = "Correct";
                        }
                        else {
                            $scope.db.message = "Incorrect";
                        }
                        $scope.db.success = success;
                    }
                };
            }
        };
    }]);

    // For now answer is just a plain text entry.
    app.directive('ximeraAnswer', ['$rootScope', 'stateService', function ($rootScope, stateService) {
        return {
            restrict: 'A',
            scope: {},
            template: "<input type='text' ng-model='db.answer' ng-disabled='db.success'><button ng-hide='db.success' ng-click='attemptAnswer()'>Submit</button><span ng-bind='db.message'></span>",
            transclude: true,
            link: function($scope, element, attrs, controller) {
                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $scope.db.success = false;
                    $scope.db.answer = "";
                    $scope.db.correctAnswer = $(element).attr('data-answer');
                    $scope.db.message = "";
                });
                
                $scope.attemptAnswer = function () {
                    if (!$scope.db.success) {
                        var success = false;
                        if ($scope.db.answer === $scope.db.correctAnswer) {
                            success = true;
                        }

                        $(element).trigger('attemptAnswer', {
                            success: success,
                            answerUuid: $(element).attr('data-uuid'),
                            answer: $scope.db.answer,
                            correctAnswer: $scope.db.correctAnswer
                        });                        

                        if (success) {
                            $scope.db.message = 'Correct';
                        }
                        else {
                            $scope.db.message = 'Incorrect';
                        }
                        $scope.db.success = success;
                    }
                };
            }
        };
    }]);

    app.controller('ResetButtonCtrl', ['$scope', 'stateService', function ($scope, stateService) {
        $scope.resetPage = stateService.resetPage;
    }]);
});
