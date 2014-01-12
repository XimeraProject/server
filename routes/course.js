var mdb = require('../mdb');
var winston = require('winston');

exports.index = function(req, res) {
    mdb.Course.find({}, function (err, courses) {
	res.render('course/index', { courses: courses });
    });
}

exports.landing = function(req, res) {
    var slug = req.params[0];
    mdb.Course.findOne({slug: slug}).exec( function (err, course) {
	if (course) {
	    res.render('course/landing', { course: course });
	} else {
            res.send("Course not found.");	    
	}
    });
}

exports.activity = function(req, res) {
    if (!req.user) {
        res.status(500).send('Need to login.');
    }
    else {
        res.render('course/activity', { params: req.params });
	    /*
        mdb.Activity.findOne({_id: req.params.id}).exec( function (err, activity) {
            if (activity) {
                var accum = "";
                var readStream = mdb.gfs.createReadStream({_id: activity.htmlFileId});
                readStream.on('data', function (data) {
                    winston.info("Data: %s", data.toString());
                    accum += data;
                });
                readStream.on('end', function () {
                    winston.info("End");
                    res.render('activity-display', { activity: activity, activityHtml: accum, activityId: activity._id });
                });
                readStream.on('error', function () {
                    res.send('Error reading activity.');
                })
            }
            else {
                res.send("Activity not found.");
            }
        });        
	    */

    }
};
