var mdb = require('../mdb'),
    async = require('async'),
    _ = require('underscore'),    
    path = require('path'),
    dirname = require('path').dirname,
    normalize = require('path').normalize,    
    extname = require('path').extname,
    pathJoin = require('path').join,
    winston = require('winston');

exports.getLabel = function(req, res) {
    var commit = req.params.commit;
    var labelName = req.params.label;

    mdb.Label.findOne({label: labelName, commit: commit}).exec( function( err, label ) {
	if (!label) {
	    res.status(500).send(err);
	} else {
	    mdb.Activity.findOne({hash: label.activityHash, commit: commit}).exec( function( err, activity ) {
		if (!activity) {
		    res.status(500).send(err);
		} else  {
		    res.json( activity );
		}
	    });
	}
    });
};

function statistics( req, res, model )
{
    var commit = req.params.commit;
    var hash = req.params.hash;

    // Verify that the user is an instructor for that given commit
    //if (('user' in req) && (req.user.instructor.indexOf(commit) > 0)) {
    if (('user' in req) && (req.user.isAuthor)) {
	// Verify that the hash belongs to the given commit
	mdb.Activity.findOne({hash: hash, commit: commit}).exec( function( err, activity ) {
	    if (err || (!activity)) {
		res.status(500).send(err);
	    } else {
		// Send answers statistics to instructor
		model.findOne({_id : hash}).exec( function( err, answers ) {
		    if (err)
			res.status(500).send(err);
		    else {
			if (answers)
			    res.json( answers.value );
			else
			    res.json( {} );
		    }
		});
	    }
	});
    } else {
	res.sendStatus(403);
    }    
}

exports.answers = function(req, res) { return statistics( req, res, mdb.Answers ); };

exports.successes = function(req, res) { return statistics( req, res, mdb.Successes ); };

exports.progress = function(req, res) {
    var username = req.params.username;
    var reponame = req.params.repository;
    var course = username + "/" + reponame;
    
    if ( (!(req.user)) || !(req.user.instructor) ) {
	res.sendStatus(403);
	return;
    }
    
    mdb.Gradebook.findOne({_id: course}).exec( function(err,gradebook) {
	if (err)
	    res.status(500).send(err);
	else {
	    var header = [];
	    var rows = {};

	    // Verify that the user is an instructor for a commit that
	    // appeared in the course
	    if (_.intersection( req.user.instructor, gradebook.commits ).length == 0) {
		console.log(" noope.");
		res.sendStatus(403);
	    } else {
		gradebook.users.forEach( function(user) {
		    var name = user.user;
		    rows[name] = [];
		    user.paths.forEach( function(path) {
			var complete = path.complete;		    
			var path = path.path;
			
			if (header.indexOf(path) < 0)
			    header.push(path);
			rows[name][header.indexOf(path)] = complete;
		    });
		});
		
		var csv = "name,";
		
		header.forEach( function(h) {
		    csv = csv + h + ",";
		});
		
		csv = csv + "\n";
		
		gradebook.users.forEach( function(user) {
		    var name = user.user;
		    csv = csv + name + ",";
		    rows[name].forEach( function(r) {
			csv = csv + r + ",";		    
		    });
		    csv = csv + "\n";
		});
		
		res.setHeader('Content-disposition', 'attachment; filename=' + reponame + '.csv');
		res.set('Content-Type', 'text/csv');
		res.status(200).send(csv);
	    }
	}
    });
};

