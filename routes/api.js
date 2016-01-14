/*
 * A RESTful API for publishing on Ximera
 */

var async = require('async');
var crypto = require('crypto');
var mongo = require('mongodb');
var cheerio = require('cheerio');
var mdb = require('../mdb');
var remember = require('../remember');
var githubApi = require('github');

exports.authenticateViaHMAC = function(req, res, next) {
    var authorization = req.header("Authorization");
    
    if (!authorization) {
	next();
	return;
    }
	
    authorization = authorization.replace(/^Ximera /,'');
    var key = authorization.replace(/:.*$/,'');
    var desiredHash = authorization.replace(/^.*:/,'');

    mdb.User.findOne({apiKey: key}, function(err,user) {
	var hmac = crypto.createHmac("sha256", user.apiSecret);
	hmac.setEncoding('hex');

	hmac.write(req.method + " " + req.path + "\n");
	hmac.end(req.rawBody, function() {
	    var hash = hmac.read();
	    if (hash == desiredHash) {
		req.user = user;
		next();
	    } else {
    		res.status(401).json("Forbidden.");
	    }
	});
    });    
}

exports.xake = function(req, res){
    res.status(200).json(req.user);
};

/** @function saveToContentAddressableFilesystem saves data to the CAFS and returns a hash via the callback */
function saveToContentAddressableFilesystem( data, callback ) {
    var hash = "";
    
    async.series(
	[
	    // Compute hash
	    function(callback) {
		var shasum = crypto.createHash('sha256');
		shasum.update(data);
		hash = shasum.digest('hex');
		callback(null);
	    },
	    function(callback) {
		// Only save if it hasn't already been saved.
		mdb.Blob.findOne({hash: hash}, function(err,blob) {

		    if (blob) {
			callback(null);
		    } else {		
			var blob = new mdb.Blob({
			    hash: hash,
			    data: data
			});
			blob.save(callback);
		    }
		});
	    }
	],function(err, result) {
	    callback( err, hash );
	    return;
	}
    );
    
    return;
}

exports.putFile = function(req, res){
    var commit = req.params.commit;
    var path = req.params.path;

    saveToContentAddressableFilesystem( req.rawBody, function(err, hash) {
	var gitFile = new mdb.GitFile();
	gitFile.commit = commit;
	gitFile.path = path;
	gitFile.hash = hash;
	gitFile.save(function(err) {
	    if (err)
		res.status(500).send();
	    else
		res.status(200).send();
	});
    });
};

exports.putCommit = function(req, res){
    var commit = req.params.commit;
    
    var owner = req.params.owner;
    var repo = req.params.repo;
    var sha = req.params.sha;
    
    var github = new githubApi({version: "3.0.0"});
    
    github.repos.getBranches( {user: owner, repo: repo }, function(err, data) {
	data.forEach( function(branch) {
	    if (branch.commit.sha == sha) {
		var b = new mdb.Branch();
		b.repository = repo;
		b.owner = owner;
		b.name = branch.name;
		b.commit = branch.commit.sha;
		b.lastUpdate = new Date();
		b.save(function(err) { return; });
	    }
	});
    });
    
    github.repos.getCommits( {user: owner, repo: repo, sha: sha }, function(err, data) {
	data = data.filter( function(commit) {
	    return commit.sha == sha;
	});
	
	if (data.length == 0) {
	    res.status(500).send("Could not locate the commit hash on GitHub; have you 'git push'ed your work?");
	} else {
	    var commitData = data[0];

	    var commit = new mdb.Commit();
	    commit.owner = owner;
	    commit.repository = repo;
	    commit.sha = sha;
	    commit.author = commitData.commit.author;
	    commit.committer = commitData.commit.committer;
	    commit.url = commitData.commit.url;
	    commit.message = commitData.message;
	    commit.tree = commitData.tree;	    
	    commit.save(function() {
		res.status(200).send();
	    });
	}
    });
};

exports.putActivity = function(req, res){
    var commit = req.params.commit;
    var path = req.params.path;

    res.status(200).send();

    var $ = cheerio.load( req.rawBody, {xmlMode: true} );
    $('a').each( function() {
	if ($(this).attr('id'))
	    $(this).remove();
    });
    var body = $('body').html();    
    var title = $('title').html();

    saveToContentAddressableFilesystem( body, function(err, hash) {
	if (err) {
	    res.status(500).send("Error in saving content to CAFS.");
	} else {
	    // Find all the learning outcomes mentioned in the <head>'s meta tags
	    /*
	      var outcomes = [];
	      
	      $('meta[name="learning-outcome"]').each( function() {
	      var learningOutcome = $(this).attr('content');
	      
	      var outcome = new mdb.Outcome();
	      outcome.name = learningOutcome;
	      outcome.hash = hash;
	      
	      outcome.save( function() {
	      winston.info( "Associated " + path + " with outcome: " + learningOutcome );
	      });
	      
	      outcomes.push( learningOutcome );
	      });*/
	    
	    // Save the HTML file to the database as an activity
	    var activity = new mdb.Activity();
	    activity.commit = commit;
	    activity.hash = hash;
	    activity.path = path.replace( /\.html$/, "" );
	    activity.title = title;
	    //activity.outcomes = outcomes;
	    
	    activity.save(function(err) {
		if (err)
		    res.status(500).send("Could not save activity.");
		else
		    res.status(200).send();
	    });
	}
    });
};
