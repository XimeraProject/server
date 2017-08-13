var mdb = require('../mdb');
var async = require('async');
var config = require('../config');

exports.index = function(req, res, next) {
    var activity = req.activity;
    
    if (activity.kind != 'xourse') {
	next('Only xourses have instructors.');
	return;
    }
    
    var xourse = activity;
    xourse.path = req.activity.path;
    if (xourse.path) {
	xourse.path = xourse.path.replace(/\.html$/,'')
    }		
    xourse.hash = req.activity.hash;

    var instructorBridges = [];
    
    async.waterfall([
	function(callback) {
	    mdb.LtiBridge.find( {user: req.user._id,
				 repository: req.repositoryName,
				 path: xourse.path},
				callback);
	},
	function(bridges, callback) {
	    callback( null, bridges.map( function(b) { return b.contextId; } ) );
	},
	function(contexts, callback) {
	    var instructorRoles = ['Instructor', 'TeachingAssistant', 'urn:lti:role:ims/lis/TeachingAssistant', 'urn:lti:role:ims/lis/Instructor'];
	    mdb.LtiBridge.find( {roles: { $elemMatch: { $in: instructorRoles } },
				 contextId: {$in: contexts},
				 repository: req.repositoryName,
				 path: xourse.path},
				callback );
	},
	function(bridges, callback) {
	    instructorBridges = bridges;
	    callback( null, bridges.map( function(b) { return b.user; } ) );
	},
	function(instructorIds, callback) {
	    mdb.User.find( {_id: { $in: instructorIds } }, callback );
	}
    ], function (err, instructors) {
	if (err)
	    next(err);
	else {
	    instructors.forEach( function(i) {
		instructorBridges.forEach( function(b) {
		    if (b.user.toString() == i._id.toString()) {
			i.bridge = b;
		    }
		});
	    });

	    var body = "Dear professor,\n\n";
	    if (req.headers.referer)
		body = body + "I am having trouble with " + req.headers.referer + "\n\n";
	    body = body + "\n\nSincerely,\n" + req.user.name;
	    body = body.replace(/\n/g,'%0D%0A');
	    body = body.replace(config.root, config.root + '/users/' + req.user._id );

	    var subject = 'Help with ' + xourse.title;
	    subject = subject.replace(/ +/g, ' ');
	    
	    res.render('instructors', {
		xourse: xourse,
		instructors: instructors,
		subject: subject,
		body: body,
		repositoryName: req.repositoryName	
	    } );
	}
    });
};    
