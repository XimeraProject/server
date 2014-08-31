var async = require('async')
  , mdb = require('../mdb')
  , winston = require('winston');

exports.logAnswer = function(req, res) {
    var activityId = req.body.activityId;
    var questionPartUuid = req.body.questionPartUuid;
    var value = req.body.value;
    var correct = req.body.correct;
    var timestamp = new Date();

    answerLog = new mdb.AnswerLog({
        activity: activityId,
        user: req.user._id,
        questionPartUuid: questionPartUuid,
        value: value,
        correct: correct,
        timestamp: timestamp
    });
    answerLog.save(function (err) {
        if (err) {
            res.json({ok: false});
        }
        else {
            res.json({ok: true});
        }
    });
}

exports.completion = function(req, res) {
    if (!req.user) {
	res.json([]);
	return;
    }
    
    if (req.user.isGuest) {
	res.json([]);
	return;
    }

    mdb.ActivityCompletion.find({ $query: {user: req.user._id} }, {}, function(err,document) {
        if (document) {
	    res.json(document);
        }
        else {
	    // If there is nothing in the database, give the client an empty array
	    res.json([]);
        }
    });

    return;
}

exports.logCompletion = function(req, res) {
    var activityId = req.body.activityId
    var percentDone = req.body.percentDone;
    var complete = req.body.complete;
    var numParts = req.body.numParts;
    var numComplete = req.body.numComplete;
    var completeUuids = req.body.completeUuids;
    var curTime = new Date();

    var locals = {};
    async.series([
        function (callback) {
            mdb.Activity.findOne({_id: activityId}, function (err, activity) {
                if (err) callback(err);
                else if (activity) {
                    locals.activity = activity;
                    callback();
                }
                else {
                    callback("Activity not found.");
                }
            });
        },
        function (callback) {
            var completeTime = complete ? curTime : null;
            var log = new mdb.CompletionLog({
                activitySlug: locals.activity.slug,
                user: req.user._id,
                activity: activityId,
                percentDone: percentDone,
                numParts: numParts,
                numComplete: numComplete,
                complete: complete,
                completeTime: completeTime,
                completeUuids: completeUuids
            });
            log.save(callback);
        },
        function (callback) {
            mdb.ActivityCompletion.findOne({
                activitySlug: locals.activity.slug,
                user: req.user._id
            }, function (err, completion) {
                if (err) callback(err);
                else if (completion) {
                    completion.activity = locals.activity._id;
                    completion.percentDone = percentDone;
                    completion.numParts = numParts;
                    completion.numComplete = numComplete;
                    completion.completeUuids = completeUuids;
                    if (complete && !completion.complete) {
                        completion.complete = true;
                        completion.completeTime = curTime;
                    }
                    completion.save(callback);
                }
                else {
                    var completeTime = complete ? curTime : null;
                    var completion = new mdb.ActivityCompletion({
                        activitySlug: locals.activity.slug,
                        user: req.user._id,
                        activity: activityId,
                        percentDone: percentDone,
			numParts: numParts,
			numComplete: numComplete,
                        complete: complete,
                        completeTime: completeTime
                    });
                    completion.save(callback);
                }

		if (locals.activity) {
		    console.log( 'Publishing.' );
		    mdb.gradebook.publish( 'grade', {numParts: numParts, numComplete: numComplete, activity: locals.activity._id, activityTitle: locals.activity.title, activitySlug: locals.activity.slug, user: req.user._id, ltiId: req.user.ltiId, course: req.user.course } );
		} else {
		    console.log( 'Missing activity.' );
		}

            });
        }
    ], function (err) {
        if (err) {
            res.json({ok: false});
        }
        else {
            res.json({ok: true});
        }
    });
}

