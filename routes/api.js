/*
 * A RESTful API for publishing on Ximera
 */

var async = require('async');
var crypto = require('crypto');
var mongo = require('mongodb');
var cheerio = require('cheerio');
var mdb = require('../mdb');
var remember = require('../remember');
var path = require('path');
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

    req.chunks = [];	
    req.on('data', function(chunk) {
	//console.log( chunk );
	req.chunks.push( new Buffer(chunk) );	    
    });    
    
    // this is a hack
    var empty = false;
    req.on('end', function() {
	empty = true;
    });
    
    mdb.User.findOne({apiKey: key}, function(err,user) {
	var hmac = crypto.createHmac("sha256", user.apiSecret);
	hmac.setEncoding('hex');

	hmac.write(req.method + " " + req.path + "\n");

	if (empty) {
	    req.rawBody = Buffer.concat( req.chunks );
	    hmac.write( req.rawBody );
	    hmac.end(function() {
		var hash = hmac.read();
		if (hash == desiredHash) {
		    req.user = user;
		    next();
		} else {
    		    res.status(401).send("Invalid signature.");
		}
	    });
	} else {
	    req.on('end', function(chunk) {
		req.rawBody = Buffer.concat( req.chunks );
		hmac.write( req.rawBody );
		hmac.end(function() {
		    var hash = hmac.read();
		    if (hash == desiredHash) {
			req.user = user;
			next();
		    } else {
    			res.status(401).send("Invalid signature.");
		    }
		});
	    });
	}
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

    if (!(req.user.isAuthor)) {
    	res.status(500).send('You must be an author to PUT files.');
	return;
    }
    
    saveToContentAddressableFilesystem( req.rawBody, function(err, hash) {
	var gitFile = {};

	gitFile.commit = commit;
	gitFile.path = path;
	gitFile.hash = hash;

	mdb.GitFile.findOneAndUpdate({commit: gitFile.commit, hash: gitFile.hash, path: gitFile.path},
				     gitFile, {upsert:true}, function(err, doc){
					 if (err)
					     res.status(500).send();
					 else
					     res.status(200).send();
				     });
    });
};

var githubRepository = async.memoize(
    function( token, user, repo, callback ) {
	var github = new githubApi({version: "3.0.0"});
	
	github.authenticate({
	    type: "oauth",
	    token: token
	});

	console.log( "downloading!" );
	github.repos.get({user: user, repo: repo}, callback );
    },
    function( token, user, repo ) {
	console.log( token + ":" + user + "/" + repo );
	return token + ":" + user + "/" + repo;
    }
);

exports.verifyCollaborator = function(req, res, next){
    if ((req.user) && (req.user.githubAccessToken)) {
	githubRepository( req.user.githubAccessToken, req.params.owner, req.params.repo, function(err, githubRepo) {
	    if (err)
		res.status(500).send(err);
	    else {
		console.log( githubRepo );
		next();
	    }
	});
    } else {
	res.status(500).send("You must attach your GitHub account to your Ximera account.");
    }
};

exports.putCommit = function(req, res){
    if (!(req.user.isAuthor)) {
    	res.status(500).send('You must have permission to PUT commits.');
	return;
    }
    
    var commit = req.params.commit;
    
    var owner = req.params.owner;
    var repo = req.params.repo;
    var sha = req.params.sha;
    
    var github = new githubApi({version: "3.0.0"});

    github.authenticate({
	type: "oauth",
	token: req.user.githubAccessToken
    });
    
    // BADBAD: it's possible that "xake publish" is being called on a branch behind github's master
    // and then this fails
    github.repos.getBranches( {user: owner, repo: repo }, function(err, data) {
	if (err) {
	    res.status(500).send("getBranches failed " + err);
	} else {	
	    data.forEach( function(branch) {
		if (branch.commit.sha == sha) {
		    var b = {};
		    b.repository = repo;
		    b.owner = owner;
		    b.name = branch.name;
		    b.commit = branch.commit.sha;
		    b.lastUpdate = new Date();

		    mdb.Branch.findOneAndUpdate({commit: b.commit, name: b.name, repository: b.repository, owner: b.owner},
						b, {upsert:true}, function(err, doc){ return; });
				 
		}
	    });
	}
    });
    
    github.repos.getCommits( {user: owner, repo: repo, sha: sha }, function(err, data) {
	if (err) {
	    res.status(500).send("getCommits failed: " + err);
	} else {
	    data = data.filter( function(commit) {
		return commit.sha == sha;
	    });
	
	    if (data.length == 0) {
		res.status(500).send("Could not locate the commit hash on GitHub; have you 'git push'ed your work?");
	    } else {
		var commitData = data[0];
		
		var commit = {};
		
		commit.owner = owner;
		commit.repository = repo;
		commit.sha = sha;
		commit.author = commitData.commit.author;
		commit.committer = commitData.commit.committer;
		commit.url = commitData.commit.url;
		commit.message = commitData.message;
		commit.tree = commitData.tree;

		mdb.Commit.findOneAndUpdate({sha: commit.sha},
					    commit, {upsert:true},
					    function(err, doc){
						if (err) {
						    res.status(500).send();
						} else {
						    res.status(200).send();
						    mdb.User.update( {_id: req.user._id}, {$addToSet: {instructor: commit.sha}},
								     function(err, doc){ return; });
						}
					    });
	    }
	}
    });
};

exports.putBareCommit = function(req, res){
    if (!(req.user.isAuthor)) {
    	res.status(500).send('You must have permission to PUT commits.');
	return;
    }
    
    var sha = req.params.sha;
    var head = JSON.parse(req.rawBody);

    var commit = {};
    
    commit.owner = undefined;
    commit.repository = undefined;
    commit.sha = sha;
    commit.author = head.author;
    commit.committer = head.committer;
    commit.message = head.message;
    commit.parents = head.parents;
    
    mdb.Commit.findOneAndUpdate({sha: commit.sha},
				commit, {upsert:true},
				function(err, doc){
				    if (err) {
					res.status(500).send();					
				    } else {
					res.status(200).send();
					mdb.User.update( {_id: req.user._id}, {$addToSet: {instructor: sha}},
							 function(err, doc){ return; });
				    }
				});


}

function findRelatedCommits( commit, callback ) {
    mdb.Branch.findOne( { commit: commit }, function( err, branch ) {
	if (err)
	    callback(err);
	else {
	    if (branch) {
		mdb.Branch.find( { owner: branch.owner, repository: branch.repository }, function( err, branches ) {
		    if (err)
			callback(err);
		    else
			callback(err, branches.map( function(branch) { return branch.commit; } ) );
		});
	    } else {
		// This could have been callback("Missing branch"); but instead I'm just going to fake it
		callback(err, [ commit ] );
	    }
	}
    });
}

function findOldActivities( xourse, callback ) {
    findRelatedCommits( xourse.commit, function(err, commits) {
	if (err)
	    callback(err);
	else {
	    mdb.Activity.find( { commit: { $in: commits } }, function( err, activities ) {
		callback( err, activities );
	    });
	}
    });
}

// BADBAD: This creates new course objects, but it should UPDATE old ones if there is one...
exports.putXourse = function(req, res){
    if (!(req.user.isAuthor)) {	
    	res.status(500).send('You must be an author to PUT xourses.');
	return;
    }
    
    var commit = req.params.commit;
    var pathname = req.params.path;

    var $ = cheerio.load( req.rawBody, {xmlMode: true} );
    
    // Guarantee that this is actually a xourse file
    var isXourse = $('meta[name="description"]').attr('content') == 'xourse';
    if (!isXourse) {
	res.status(500).send("Meta name description does not equal 'xourse'." );
	return;
    }
    
    var body = $('body').html();
    var title = $('title').html();

    saveToContentAddressableFilesystem( body, function(err, hash) {
	if (err) {
	    res.status(500).send("Error in saving content to CAFS.");
	} else {
	    var xourse = {};
	    
            // Save the HTML file to the database as an xourse
            xourse.commit = commit;
            xourse.hash = hash;
            xourse.path = pathname.replace( /.html$/, "" );
            xourse.title = title;

	    // Both the order and the associated activity data are important
            xourse.activityList = [];
            var activityHash = {};
	    
	    // Go through the xourse text and add the activity URLs to the activity list
	    $('.card').each( function() {
		// Activities have href's
		var href = '#';
		
		if ($(this).attr('href')) {
		    href = $(this).attr('href');
		} else if ($(this).attr('id')) {
		    href = '#' + $(this).attr('id');
		} else {
		    // BADBAD: without an href or an id, we're in trouble
		}

		if (href != "#") {
		    activityHash[href] = { cssClass: $(this).attr('class').split(" ").filter( function(x) { return (x != 'card') && (x != 'activity') && (x.length > 0); } ).join(' ') };
		    
		    if ($(this).hasClass('part')) {
			activityHash[href].title = $(this).html();
		    }
		    
		    xourse.activityList.push( href );
		}
	    });

	    // BADBAD: this is broken -- the xourse object needs to have an activity list
	    
            // Find all activities for the given xourse
            mdb.Activity.find( { commit: xourse.commit, path: { $in: Object.keys(activityHash) } }, function(err, activities) {
                if (err)
		    res.status(500).send(err);
                else {
		    async.series(
			[function(callback) {
			    async.each(activities, function(activity, callback) {
				if (!(activity.path in activityHash))
				    activityHash[activity.path] = {};
				
				activityHash[activity.path].title = activity.title;
				activityHash[activity.path].hash = activity.hash;
				
				mdb.Blob.findOne({hash: activity.hash}, function(err, blob) {
				    var $ = cheerio.load( blob.data );
				    
				    var images = $('img');
				    if (images.length > 0)
					activityHash[activity.path].splashImage = path.normalize(
					    path.join( path.dirname( activity.path ),
                                                       images.first().attr('src') ) );
				    
				    var summary = $('div.abstract');
				    if (summary.length > 0)
					activityHash[activity.path].summary = summary.text();
				    
				    var beginning = $('p');
				    if (beginning.length > 0)
					activityHash[activity.path].beginning = beginning.first().text();
				    
				    callback(err);
				});
			    }, function(err) {
				xourse.activities = activityHash;
				//xourse.markModified('activities');
				callback(err);
			    });
			},
			 function(callback) {
			     findOldActivities( xourse, function(err, activities) {
				 if (err) {
				     res.status(500).send(err);
				 } else {
				     activities.forEach( function(activity) {
					 if ( ! (activity.path in xourse.activities))
					     xourse.activities[activity.path] = {};
					 
					 if ( ! ('hashes' in xourse.activities[activity.path]))
					     xourse.activities[activity.path].hashes = [];
					 
					 if (xourse.activities[activity.path].hashes.indexOf( activity.hash ) < 0) {
					     xourse.activities[activity.path].hashes.push( activity.hash );
					     //xourse.markModified('activities');
					 }
				     });
				     
				     callback(null);
				 }
			     });
			 }
			],
			function(err) {
			    // Save xourse!
			    mdb.Xourse.findOneAndUpdate({commit: xourse.commit, hash: xourse.hash, path: xourse.path},
							xourse, {upsert:true}, function(err, doc){
				if (err)
				    res.status(500).send("Could not save xourse.");
				else
				    res.status(200).send();
			    });
			});
		}
	    });
	}
    });
}

exports.putActivity = function(req, res){
    if (!(req.user.isAuthor)) {	
    	res.status(500).send('You must be an author to PUT activities.');
	return;
    }
    
    var commit = req.params.commit;
    var pathname = req.params.path;

    var $ = cheerio.load( req.rawBody, {xmlMode: true} );

    // Find all \labels in the activity
    var labels = [];
    $('a.ximera-label').each( function() {
        labels.push( $(this).attr('id') );
    });
    
    // Remove, well, ... put a zero-width space inside the anchor links that htlatex is inserting
    // This prevents cheerio from rendering them as <a id="blah"/> which is not HTML-compliant.
    $('a').each( function() {
	if ($(this).attr('id')) {
	    $(this).html("&#8203;");
	}
    });

    var body = $('body').html();
    var title = $('title').html();

    saveToContentAddressableFilesystem( body, function(err, hash) {
	if (err) {
	    res.status(500).send("Error in saving content to CAFS.");
	} else {
	    // Save the HTML file to the database as an activity
	    var activity = {};
	    activity.commit = commit;
	    activity.hash = hash;
	    activity.path = pathname.replace( /\.html$/, "" );
	    activity.title = title;
	    // BADBAD: all the outcomes should be read from the <head>
	    //activity.outcomes = outcomes;
	    activity.outcomes = [];

	    mdb.Activity.findOneAndUpdate({commit: activity.commit, hash: activity.hash, path: activity.path},
					  activity, {upsert:true}, function(err, doc){
					      if (err)
						  res.status(500).send("Could not save activity: " + err);
					      else
						  res.status(200).send();					      
					});

            if (labels.length > 0) {
  	      mdb.Label.collection.insert( labels.map( function(label) {
  		  return { activityHash: activity.hash, commit: activity.commit, label: label };
	      }), function(err, doc) {
	  	  // ignore errors
	      });
	    }

	    // Find all the learning outcomes mentioned in the <head>'s meta tags
	    /*
	      var outcomes = [];
	      
	      $('meta[name="learning-outcome"]').each( function() {
	      var learningOutcome = $(this).attr('content');
	      
	      var outcome = new mdb.Outcome();
	      outcome.name = learningOutcome;
	      outcome.hash = hash;
	      
	      outcome.save( function() {
	      winston.info( "Associated " + pathname + " with outcome: " + learningOutcome );
	      });
	      
	      outcomes.push( learningOutcome );
	      });*/
	}
    });
};
