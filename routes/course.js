var mdb = require('../mdb');

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
	var courseSlug = req.params[0];
	var activitySlug = req.params[1];

	if (!activitySlug.match( ':' )) {
	    var repo = courseSlug.split('/').slice(0,2).join( '/' )
	    activitySlug = repo + ':' + activitySlug;
	}
	console.log( activitySlug );

	mdb.Course.findOne({slug: courseSlug}).exec( function(err,course) {
	    if (course) {
		mdb.Activity.findOne({recent: true, slug: activitySlug}).exec( function (err, activity) {
		    if (activity) {
			console.log( activity );
			var accum = "";
			var readStream = mdb.gfs.createReadStream({_id: activity.htmlFile});
			readStream.on('data', function (data) {
			    accum += data;
			});
			readStream.on('end', function () {
			    var parentActivity = course.activityParent(activity);
			    var nextActivity = course.nextActivity(activity);
			    var previousActivity = course.previousActivity(activity);
			    res.render('course/activity', 
				       { activity: activity, activityHtml: accum, 
					 parentActivity: parentActivity, 
					 course: course, 
					 nextActivity: nextActivity, previousActivity: previousActivity }); 
			});
			readStream.on('error', function () {
			    res.send('Error reading activity.');
			})
		    } else { 
			res.send("Activity not found.");
		    }
		});

	    } else {
                res.send("Course not found.");
	    }
	});
    }
};
