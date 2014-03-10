var mdb = require('../mdb'),
    remember = require('../remember'),
    async = require('async'),
    winston = require('winston');

exports.index = function(req, res) {
    remember(req);
    mdb.Course.find({}, function (err, courses) {
	res.render('course/index', { courses: courses });
    });
}

exports.landing = function(req, res) {
    remember(req);
    var slug = req.params[0];
    mdb.Course.findOne({slug: slug}).exec( function (err, course) {
	if (course) {
	    res.render('course/landing', { course: course });
	} else {
            res.send("Course not found.");
	}
    });
}

function findCourseAndActivityBySlugs(user, courseSlug, activitySlug, callback) {
    var locals = {course: null, activity: null};
    async.series([
        function (callback) {
            mdb.Course.findOne({slug: courseSlug}).exec(function(err, course) {
                locals.course = course;
                callback();
            });
        },
        function (callback) {
            // Get activities for slug with most recent first.
	    mdb.Activity.find({slug: activitySlug}).sort({timeLastUsed: -1}).exec( function (err, activities) {
                locals.activities = activities;
                callback();
            });
        },
        function (callback) {
            // Find most recent activity version for which this user has scope.
            if (locals.activities) {
                async.eachSeries(locals.activities, function (activity, callback) {
                    if (!locals.activity) {
                        mdb.Scope.findOne({activity: activity._id, user: user._id}, function (err, scope) {
                            if (scope) {
                                locals.activity = activity;
                            }
                            callback();
                        });
                    }
                    else {
                        callback();
                    }
                }, callback);
            }
            else {
                callback();
            }
        },
        function (callback) {
            // If no scope for any version, default to most recent.
            if (!locals.activity && locals.activities.length > 0) {
                locals.activity = locals.activities[0];
            }
            callback();
        }

    ],
    function () {
        callback(locals.course, locals.activity);
    });
}

function getActivityHtml(activity, callback) {
    var accum = "";
    var readStream = mdb.gfs.createReadStream({_id: activity.htmlFile});
    readStream.on('data', function (data) {
	accum += data;
    });
    readStream.on('end', function () {
        callback(accum);
    });
}

// Update to most recent version of activity.
exports.activityUpdate = function(req, res) {
    var courseSlug = req.params[0];
    var activitySlug = req.params[1];

    if (!activitySlug.match( ':' )) {
	var repo = courseSlug.split('/').slice(0,2).join( '/' )
	activitySlug = repo + ':' + activitySlug;
    }

    var locals = {};

    async.series([
        function (callback) {
            mdb.Activity.findOne({recent: true, slug: activitySlug}, function (err, activity) {
                locals.activity = activity;
                callback();
            });
        },
        function (callback) {
            if (locals.activity) {
                mdb.Scope.findOne({activity: locals.activity._id, user: req.user}, function (err, scope) {
                    if (!scope) {
                        // Need to create new scope for most recent version.
                        var newScope = new mdb.Scope({activity: locals.activity._id, user: req.user._id, dataByUuid: null});
                        newScope.save(callback);
                    }
                    else {
                        callback();
                    }
                });
            }
            else {
                res.status(500).send("Could not find activity.");
                callback("Could not find activity.");
            }
        },
        function (callback) {
            res.redirect('..');
            callback();
        }]);
}

exports.instructorActivity = function(req, res) {
    res.locals.instructorApp = true;
    return exports.activity(req, res);
}

exports.activity = function(req, res) {
    remember(req);
    var courseSlug = req.params[0];
    var activitySlug = req.params[1];

    if (!activitySlug.match( ':' )) {
	var repo = courseSlug.split('/').slice(0,2).join( '/' )
	activitySlug = repo + ':' + activitySlug;
    }

    var locals = {};

    async.series([
        function (callback) {
            findCourseAndActivityBySlugs(req.user, courseSlug, activitySlug, function (course, activity) {
                locals.course = course;
                locals.activity = activity;
                if (!course) {
                    callback("Course not found.");
                }
                else if (!activity) {
                    callback("Activity not found.");
                }
                else {
                    callback();
                }
            });
        },
        function (callback) {
            getActivityHtml(locals.activity, function(html) {
                locals.activityHtml = html;
                if (!html) {
                    res.send('Error reading activity.');
                }
                else {
                    callback();
                }
            });
        },
        function (callback) {
	    //var parentActivity = locals.course.activityParent(locals.activity);
	    var nextActivity = locals.course.nextActivity(locals.activity);
	    var previousActivity = locals.course.previousActivity(locals.activity);
	    res.render('course/activity',
		       { activity: locals.activity, activityHtml: locals.activityHtml,
			 course: locals.course,
			 nextActivity: nextActivity, previousActivity: previousActivity,
			 activityId: locals.activity._id.toString()
		       });
        }
    ],
    function (err) {
        if (err) {
            res.send(err);
        }
    });
};

exports.activitySource = function(req, res) {
    remember(req);

    var courseSlug = req.params[0];
    var activitySlug = req.params[1];

    if (!activitySlug.match( ':' )) {
	var repo = courseSlug.split('/').slice(0,2).join( '/' )
	activitySlug = repo + ':' + activitySlug;
    }

    var locals = {};

    async.series([
        function (callback) {
            findCourseAndActivityBySlugs(req.user, courseSlug, activitySlug, function (course, activity) {
                locals.course = course;
                locals.activity = activity;
                if (!course) {
                    res.send("Course not found.");
                }
                if (!activity) {
                    res.send("Activity not found.");
                }
                callback();
            });
        },
        function (callback) {
            getActivityHtml(locals.activity, function(html) {
                locals.activityHtml = html;
                if (!html) {
                    res.send('Error reading activity.');
                }
                callback();
            });
        },
        function (callback) {
            res.render('activity-source', { activity: locals.activity, activityId: locals.activity._id });
        }
    ]);
};
