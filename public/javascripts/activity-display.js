// Script expects data-activityId attribute in activity div.
define(['angular', 'jquery', 'underscore'], function(angular, $, _) {
    var app = angular.module('ximeraApp.activity', []);

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
    app.directive('ximeraShuffle', ['$timeout', 'questionService', 'stateService', function ($timeout, questionService, stateService) {
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

                $timeout(function () {
                    questionService.registerForQuestions(element, function (questionUuid) {
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
                });

                // Setup watches.
                $scope.$watch("[db.doneUuids, db.activeQuestionUuid]", function (newVals) {
                    var doneUuids = newVals[0];
                    var activeQuestionUuid = newVals[1];
                    if (!doneUuids) {
                        return;
                    }

                    // Sort by order done.
                    var last = null;
                    _.each(doneUuids, function (doneUuid) {
                        var doneElt = $(element).find("[data-uuid='" + doneUuid + "']");
                        if (last) {
                            $(doneElt).insertAfter(last);
                        }
                        else {
                            // TODO: Prettify
                            $("[data-uuid=" + activeQuestionUuid + "]").insertAfter(doneElt);
                        }
                        last = doneElt;
                    });

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
    var questionDirective = ["$timeout", "answerService", "questionService", "stateService", function ($timeout, answerService, questionService, stateService) {
        return {
            restrict: 'A',
            scope: {},
            link: function($scope, element, attrs, controller) {
                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $timeout(function () {
                        $scope.db.solutionProgress = 0;
                        var solutions = $(element).find('.solution');
                        $scope.db.totalSolutionParts = solutions.length;
                    });
                });
                // Which part of the question are we up to; only reveal next part after first is complete.


                $scope.$watch('db.solutionProgress', function (part) {
                    $(element).find('.solution').each(function (ii, solutionElt) {
                        if (ii <= part) {
                            $(solutionElt).show();
                        }
                        else {
                            $(solutionElt).hide();
                        }
                    });
                });

                // TODO: Track by UUID instead of by counting; syncing with answer element?
                answerService.registerForAnswers(element, function (success) {
                    // TODO: Change display when complete?
                    if (success) {
                        $scope.db.solutionProgress += 1;
                    }
                    if ($scope.db.solutionProgress >= $scope.db.totalSolutionParts) {
                        questionService.completeQuestion(element);
                    }
                });

            }
        }
    }]

    app.directive('ximeraQuestion', questionDirective);
    app.directive('ximeraExercise', questionDirective);
    app.directive('ximeraExploration', questionDirective)

    app.directive('ximeraSolution', ["answerService", "stateService", function (answerService, stateService) {
        return {
            restrict: 'A',
            scope: {},
            link: function($scope, element, attrs, controller) {
                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $scope.db.complete = false;
                });

                answerService.registerForAnswers(element, function (success) {
                    // TODO: Change display when complete?
                    if (success) {
                        $scope.db.complete = true;
                    }
                });
            }
        };
    }]);

    app.directive('ximeraAnswer', ["answerService", "stateService", function (answerService, stateService) {
        return {
            restrict: 'A',
            scope: {},
            template: "<input type='text' ng-model='db.answer' ng-disabled='db.success'><button ng-hide='db.success' ng-click='attemptAnswer()'>Submit</button><span ng-bind='db.message'></span>",
            transclude: true,
            link: function($scope, element, attrs, controller) {
                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
                    $scope.db.success = false;
                    $scope.db.answer = "";
                    $scope.db.message = "";
                });
                
                $scope.attemptAnswer = function () {
                    if (!$scope.db.success) {
                        $scope.db.success = answerService.attemptAnswerFor(element, $scope.db.answer);
                        if ($scope.db.success) {
                            $scope.db.message = "Correct";
                        }
                        else {
                            $scope.db.message = "Incorrect";
                        }
                    }
                };
            }
        };    
    }]);

    app.controller('ResetButtonCtrl', ['$scope', 'stateService', function ($scope, stateService) {
        $scope.resetPage = stateService.resetPage;
    }]);

    //  Multiple choice:
    // TODO: Display multiple choice form.
    // TODO: Count correct answer.
});