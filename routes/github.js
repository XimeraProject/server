/*
 * GET users listing.
 */

var crypto = require('crypto');
var mongo = require('mongodb');
var mdb = require('../mdb');
var winston = require("winston");
var mongoose = require('mongoose');

// The GitHub webhook secret must be set in app.js
exports.secret = '';

exports.github = function(req, res){
    var hash = req.header("X-Hub-Signature");
    var hmac = crypto.createHmac("sha1", exports.secret);
    var content = '';

    hmac.update(req.rawBody);
    var crypted = 'sha1=' + hmac.digest("hex");

    if(crypted === hash) {
        // Valid signature
	if (req.header("X-GitHub-Event") == "ping") {
	    res.sendStatus(200);
	    return;
	}

	var repository = req.body.repository;
	var ref = req.body.ref;	
	
	if (repository && ('full_name' in repository)) {
	    console.log( "repository = " + JSON.stringify(repository) );
	    var sender = req.body.sender;
	    console.log( "sender = " + JSON.stringify(sender) );
	    
	    mdb.GitRepo.findOne({gitIdentifier: repository.full_name}).exec( function (err, repo) {
		if (repo) {
		    // Courses linked to repo need to be updated
		    mdb.GitRepo.update( repo, {$set: { needsUpdate : true }}, {},
					function( err, document ) {
					    winston.info( 'Requesting update for repo ' + repository.full_name );
					});
		} else {
		    // This is a new repo; we should create it (and wait for the external processor to create the courses therein)
		    repo = mdb.GitRepo({
			gitIdentifier: repository.full_name,
			file: mongoose.Types.ObjectId(),
			needsUpdate: true,
		    });
		    
		    repo.save(function () {
			winston.info( 'Requesting creation of repo ' + repository.full_name );
		    });
		}

		mdb.User.findOne({githubId: sender.id}).exec( function(err, githubUser) {
		    if (err) {
			res.sendStatus(400, err);
		    } else {
			if (githubUser) {
			    var push = mdb.GitPushes({
				gitIdentifier: repository.full_name,
				sender: sender,
				repository: repository,
				ref: ref,
				senderAccessToken: githubUser.githubAccessToken,
				headCommit: req.body.head_commit,
				finishedProcessing: false
			    });
			    
			    push.save();
			    
			    res.sendStatus(200);
			} else {
			    res.sendStatus(400, 'No GitHub account logged in');
			}
		    }
		});
	    });
	}
    } else {
        // Invalid signature
        res.sendStatus(403, "Invalid X-Hub-Signature");
    }
};
