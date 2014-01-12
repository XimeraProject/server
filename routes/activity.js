var mdb = require('../mdb');
var winston = require('winston');

/*
 * GET activity listing.
 */

exports.list = function(req, res){
    mdb.Activity.find({}, function (err, activities) {
        res.render("activities", {activities: activities});
    });
};


/*
 * GET individual activity.
 */

// TODO: Temporary user accounts
exports.display = function(req, res) {
    if (!req.user) {
        res.status(500).send('Need to login.');
    }
    else {
        mdb.Activity.findOne({_id: req.params.id}, function (err, activity) {
            if (activity) {
                var accum = "";
                var readStream = mdb.gfs.createReadStream({_id: activity.htmlFile});
                readStream.on('data', function (data) {
                    winston.info("Data: %s", data.toString());
                    accum += data;
                });
                readStream.on('end', function () {
                    winston.info("End");
                    res.render('activity-display', { activityHtml: accum, activityId: activity._id });
                });
                readStream.on('error', function () {
                    res.send('Error reading activity.');
                })
            }
            else {
                res.send("Activity not found.");
            }
        });        
    }
};
