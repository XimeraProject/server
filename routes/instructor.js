var async = require('async')
  , mdb = require('../mdb')
  , mongoose = require('mongoose')
  , _ = require('underscore');

exports.activityAnalytics = function(req, res) {
    var version = req.params.id;
    var locals = {};
    async.series([
        function (callback) {
            mdb.Activity.find({_id: new mongoose.Types.ObjectId(version)}, function (err, activity) {
                if (err) callback(err);
                locals.activity = activity;
                callback();
            });
        },
        function (callback) {
            mdb.CompletionLog.find({activity: new mongoose.Types.ObjectId(version)}, function (err, completionLogs) {
                if (err) callback(err);
                locals.completionLogs = completionLogs;
                callback();
            });
        },
        function (callback) {
            mdb.AnswerLog.find({activity: new mongoose.Types.ObjectId(version)}, function (err, answerLogs) {
                if (err) callback(err);
                locals.answerLogs = answerLogs;
                callback();
            });
        },
        function (callback) {
            mdb.ActivityCompletion.find({activitySlug: locals.activitySlug}, function (err, completions) {
                if (err) callback(err);
                locals.completions = completions;
                callback();
            });
        },
        function (callback) {
            var usersViewing = _.map(locals.completionLogs, function (log) {
                return log.user;
            });

            var usersCompleteObj = {};
            var usersPercentDone = {};
            _.each(locals.completionLogs, function(log) {
                var userId = log.user.toString();
                if (userId in usersPercentDone) {
                    usersPercentDone[userId] = Math.max(log.percentDone, usersCompleteObj[userId]);
                }
                else {
                    usersPercentDone[userId] = log.percentDone;
                }

                if (log.complete) {
                    usersCompleteObj[userId] = true;
                }
            });

            var usersComplete = _.keys(usersCompleteObj);
            var completionPercentSum = [0];
            _.each(_.values(usersPercentDone), function (percent) {
                completionPercentSum[0] += percent;
            });
            var averageCompletionPercent = completionPercentSum[0] / usersViewing.length;
            locals.activityAnalytics = {
                averageCompletionPercent: averageCompletionPercent,
                numberViewing: usersViewing.length,
                numberComplete: usersComplete.length
            }
            callback();
        },
        function (callback) {
            var answerLogsByUuid = {};
            _.each(locals.answerLogs, function (answerLog) {
                if (!(answerLog.questionPartUuid in answerLogsByUuid)) {
                    answerLogsByUuid[answerLog.questionPartUuid] = [answerLog];
                }
                else {
                    answerLogsByUuid[answerLog.questionPartUuid].push(answerLog);
                }
            });

            var analyticsByUuid = {};
            _.each(_.keys(answerLogsByUuid), function (uuid) {
                var analytics = {};
                var answerLogs = _.sortBy(answerLogsByUuid[uuid], function (answerLog) {
                    return answerLog.timestamp;
                });

                var answerLogsByUser = {};
                _.each(answerLogs, function (answerLog) {
                    var userId = answerLog.user.toString();
                    if (userId in answerLogsByUser) {
                        answerLogsByUser[userId].push(answerLog);
                    }
                    else {
                        answerLogsByUser[userId] = [answerLog];
                    }
                });

                var totalUsersCorrect = [0];
                var attemptCountUntilCorrectByUser = {};
                _.each(_.keys(answerLogsByUser), function (userId) {
                    var userAnswerLogs = answerLogsByUser[userId];
                    var isCorrect = false;
                    var attemptCount = 0;
                    _.each(userAnswerLogs, function (userAnswerLog) {
                        if (!isCorrect) {
                            attemptCount += 1;
                        }
                        isCorrect = userAnswerLog.correct || isCorrect;
                    });
                    if (isCorrect) {
                        totalUsersCorrect += 1
                        attemptCountUntilCorrectByUser[userId] = attemptCount;
                    }
                });

                analytics.percentUsersCorrect = totalUsersCorrect[0] / _.keys(answerLogsByUser).length;
                var totalResponsesBeforeCorrect = [0];
                _.each(_.values(attemptCountUntilCorrectByUser), function (count) {
                    totalResponsesBeforeCorrect[0] += count;
                });
                analytics.averageResponsesBeforeCorrect = totalResponsesBeforeCorrect[0] / totalUsersCorrect[0];

                var wrongAnswerCount = {};
                var totalAttempts = [0];
                var totalCorrect = [0];
                _.each(answerLogs, function (answerLog) {
                    totalAttempts[0] += 1;
                    if (!answerLog.correct) {
                        if (answerLog.answer in wrongAnswerCount) {
                            wrongAnswerCount[answerLog.answer] = 1;
                        }
                        else {
                            wrongAnswerCount[answerLog.answer] += 1;
                        }
                    }
                    else {
                        totalCorrect[0] += 1;
                    }
                });

                analytics.percentAttempting = _.keys(answerLogsByUser).length / locals.completionLogs.length;
                analytics.totalAttempts = totalAttempts[0];
                analytics.totalCorrect = totalCorrect[0];
                // Return 5 most common wrong answers.
                analytics.sortedWrongAnswers = _.sortBy(_.pairs(wrongAnswerCount), function (pair) {
                    return -pair[1];
                }).slice(0, 5);

                analyticsByUuid[uuid] = analytics;
            });
            locals.answerAnalyticsByUuid = analyticsByUuid;
            callback();
        },
        function (callback) {
            res.json({
                answerAnalyticsByUuid: locals.answerAnalyticsByUuid,
                activityAnalytics: locals.activityAnalytics
            });
            callback();
        }
    ]);
}
