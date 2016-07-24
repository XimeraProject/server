
/*
 * GET users listing.
 */

var crypto = require('crypto');
var uuid = require('node-uuid');
var mongo = require('mongodb');
var validator = require('validator');
var moment = require('moment');
var async = require('async');
var mdb = require('../mdb');
var remember = require('../remember');
var githubApi = require('github');

function hasPermissionToView( viewer, viewee ) {
    if (viewer._id.equals(viewee._id))
	return "this is you.";

    if ((viewee.visibility == "users") && (!(viewer.isGuest)))
	return "this profile is being shared with other learners";

    if (viewee.visibility == "everyone")
	return "this profile is visible to everyone";

    if (viewer.superuser)
	return "you are a superuser";
    
    return false;
}

function hasPermissionToEdit( viewer, viewee ) {
    if ( ! hasPermissionToView( viewer, viewee ))
	return false;

    if (viewer._id.equals(viewee._id))
	return "this is you.";	

    if (viewer.superuser)
	return "you are a superuser";	

    return false;
}



exports.getCurrent = function(req, res){
    if (!req.user) {
	res.json(0);
	return;
    }

    if (req.user.email)
	req.user.gravatar = crypto.createHash('md5').update(req.user.email).digest("hex");

    if (req.user.googleOpenId) req.user.googleOpenId = "token";
    if (req.user.courseraOAuthId) req.user.courseraOAuthId = "token";
    if (req.user.githubId) req.user.githubId = "token";
    if (req.user.twitterOAuthId) req.user.twitterOAuthId = "token";
    
    req.user.apiKey = "";
    req.user.apiSecret = "";
    req.user.password = "";
    
    res.json(req.user);
};

exports.currentProfile = function(req, res){
    var editable = true;
    res.render('user', { userId: '', user: req.user, editable: editable, title: req.user.name } );
};

exports.profile = function(req, res){
    var id = req.params.id;
    var editable = ('user' in req) && (req.user.superuser || (req.user._id === id));
    res.render('user', { userId: req.params.id, user: req.user, editable: editable, title: 'Profile' } );
};

exports.putSecret = function(req, res){
    var id = req.params.id;

    if (!req.user) {
	res.send(401);
    }

    // BADBAD: should include more nuanced security here
    if (req.user._id.toString() != id) {
        res.status(500).send('No permission to access other users.');
	return;	
    }

    var hash = {};
    hash.apiKey = uuid.v4();
    hash.apiSecret = crypto.createHash('sha256').update(uuid.v4()).update(crypto.randomBytes(256)).digest('hex');
    
    mdb.User.update( {_id: new mongo.ObjectID(id)}, {$set: hash},
		     function(err, d) {
			 
			 if (err)
			     res.send(500);
			 else {
			     res.status(200).json(hash);
			 }
		     });
};

////////////////////////////////////////////////////////////////
// delete an account, unless it is the last linked account
exports.deleteLinkedAccount = function(req, res, account){
    var id = req.params.id;
    
    if (!req.user) {
	res.send(401);
    }
    
    // BADBAD: should include more nuanced security here
    if (req.user._id.toString() != id) {
        res.status(500).send('No permission to access other users.');
	return;
    }

    accountHash = {};

    present = { $exists: true };
    otherAccounts = { googleOpenId: present, 
		      twitterOAuthId: present,
		      courseraOAuthId: present,
		      githubId: present };
    
    if (account == 'google') {
	accountHash['googleOpenId'] = "";
	delete otherAccounts['googleOpenId'];
    }
    
    if (account == 'twitter') {
	accountHash['twitterOAuthId'] = "";
	delete otherAccounts['twitterOAuthId'];
    }

    if (account == 'coursera') {
	accountHash['courseraOAuthId'] = "";
	delete otherAccounts['courseraOAuthId'];
    }

    if (account == 'github') {
	accountHash['githubId'] = "";
	delete otherAccounts['githubId'];
    }

    // Need an array instead of a hash for mongodb $or
    otherAccounts = Object.keys(otherAccounts).map( function(x) {
	var pair = {};
	pair[x] = otherAccounts[x];
	return pair;
    });
    
    // Only look for a user who has OTHER accounts available
    mdb.User.update({ _id: new mongo.ObjectID(id),
			  $or: otherAccounts
			},
			{ $unset: accountHash },
			{},
			function(err,result,status) {
			    if (err)
				res.status(500).send("Unknown error.");
			    else {
				if (result.n <= 0) {
				    res.status(404).send("No other account available; you cannot delete the only linked account.");
				} else {
				    res.status(200).send("Successfully removed " + account);
				}
			    }
			});
    
    return;
}

exports.get = function(req, res){
    var id = req.params.id;

    if (!req.user) {
	res.send(401);
    }

    mdb.User.findOne({_id: new mongo.ObjectID(id)}, function(err,document) {
        if (document) {
	    var viewerPermission = hasPermissionToView( req.user, document );
	    if ( ! viewerPermission ) {
		res.status(500).send('No permission to access other users.');
		return;			
	    } else {
		// Add one view to the count of profileViews
		mdb.User.update({_id: new mongo.ObjectID(id)},
				{ $inc: { profileViews: 1 } });

		
		if (document.email)
	    	    document.gravatar = crypto.createHash('md5').update(validator.normalizeEmail(document.email)).digest("hex");

		if (document.birthday) {
		    document.formattedBirthday = moment(new Date(document.birthday)).format('MMMM D, YYYY');
		}	    
	    
		if (req.user._id.equals(document._id))
		    document.pronouned = "me";
		else
		    document.pronouned = document.name;		

		if (!hasPermissionToEdit(req.user, document)) {
		    document.googleOpenId = undefined;
		    document.courseraOAuthId = undefined;
		    document.githubId = undefined;
		    document.twitterOAuthId = undefined;
		    document.apiKey = "";
		    document.apiSecret = "";
		    document.password = "";
		}
		
		res.format({
		    html: function(){
			remember(req);
			
			res.render('user/profile', { userId: req.params.id,
						     user: req.user,
						     script: "user/profile",
						     person: document,
						     whyVisible: "Visible to you because " + viewerPermission,
						     editable: hasPermissionToEdit(req.user, document),
						     title: 'Profile' } );
		    },

		    json: function(){
			res.json(document);
		    }
		});
	    }
        }
        else {
	    res.status(404).json({});
        }
    });
};

exports.edit = function(req, res){
    var id = req.params.id;

    if (!req.user) {
	res.send(401);
    }

    mdb.User.findOne({_id: new mongo.ObjectID(id)}, function(err,document) {
        if (document) {
	    if ( ! hasPermissionToEdit( req.user, document )) {
		res.status(500).send('No permission to edit that user.');
		return;
	    } else {
		if (document.email)
	    	    document.gravatar = crypto.createHash('md5').update(validator.normalizeEmail(document.email)).digest("hex");

		if (req.user._id.equals(document._id))
		    document.pronouned = "me";
		else
		    document.pronouned = document.name;
		
		if (document.birthday) {
		    document.formattedBirthday = moment(new Date(document.birthday)).format('MMMM D, YYYY');
		}
		
		res.format({
		    html: function(){
			remember(req);
			console.log(document);
			res.render('user/edit', { userId: req.params.id,
						  user: req.user,
						  script: "user/profile",
						  person: document,
						  whyVisible: "Visible to you because " + hasPermissionToView( req.user, document ),
						  editable: hasPermissionToEdit(req.user, document),
						  title: 'Profile' } );
		    },
		});
	    }
        }
        else {
	    res.status(404).json({});
        }
    });
};

exports.update = function(req, res){
    var id = req.params.id;

    if (!req.user) {
	res.send(401);
    }

    mdb.User.findOne({_id: new mongo.ObjectID(id)}, function(err,document) {
        if (document) {
	    if ( ! hasPermissionToEdit( req.user, document )) {
		res.status(500).send('No permission to access other users.');
		return;			
	    } else {	    
		if (req.user._id.toString() == id)
		    document.pronouned = "me";
		else
		    document.pronouned = document.name;			    
	    
		var hash = {};

		if (req.body.displayName)
		    document.displayName = hash.displayName = validator.toString(req.body.displayName);	    
		else
		    document.displayName = hash.displayName = '';		
		
		if (req.body.visibility)
		    if (validator.isIn(req.body.visibility, ["none", "users", "everyone"]))
			document.visibility = hash.visibility = req.body.visibility;
		
		if ((req.body.email) && (validator.isEmail(req.body.email)))
		    document.email = hash.email = validator.normalizeEmail(req.body.email);
		else
		    document.email = hash.email = '';		
		
		if ((req.body.homepage) && (validator.isURL(req.body.homepage)))
		    document.website = hash.website = req.body.homepage;
		else
		    document.website = hash.website = '';	
		
		if (req.body.birthday)
		    document.birthday = hash.birthday = validator.toDate(req.body.birthday);
		else
		    document.birthday = '';
		
		if (document.birthday) {
		    document.formattedBirthday = moment(new Date(document.birthday)).format('MMMM D, YYYY');
		}	    
		
		if (req.body.biography)
		    document.biography = hash.biography = validator.toString(req.body.biography);
		else
		    document.biography = hash.biography = '';
		
		if (req.body.location)
		    document.location = hash.location = validator.toString(req.body.location);
		
		if (document.email)
	    	    document.gravatar = crypto.createHash('md5').update(validator.normalizeEmail(document.email)).digest("hex");	    

		// Only superusers can edit flags
		if (req.user.superuser) {
		    if (req.body.isInstructor) 
			document.isInstructor = hash.isInstructor = true;
		    else
			document.isInstructor = hash.isInstructor = false;

		    if (req.body.isAuthor) 
			document.isAuthor = hash.isAuthor = true;
		    else
			document.isAuthor = hash.isAuthor = false;

		    if (req.body.isGuest) 
			document.isGuest = hash.isGuest = true;
		    else
			document.isGuest = hash.isGuest = false;		    

		    if (req.body.superuser) 
			document.superuser = hash.superuser = true;
		    else
			document.superuser = hash.superuser = false;		    		    
		}
		
		mdb.User.update( {_id: new mongo.ObjectID(id)}, {$set: hash},
				 function(err, d) {
				     
				     if (err)
					 res.send(500);
				     else {	
					 res.render('user/profile', { userId: req.params.id,
								      user: req.user,
								      updated: true,
								      script: "user/profile",
								      person: document,
								      editable: true,
								      title: 'Profile' } );
				     }
				 });
	    }
        }
        else {
	    res.status(404).json({});
        }
    });
};

exports.courses = function(req, res){
    var id = req.params.id;
    var owner = req.params.owner;
    var repo = req.params.repo;
    
    mdb.User.findOne({_id: new mongo.ObjectID(id)}, function(err,instructor) {    
	if ((err) || (! instructor)) {
            res.status(500).send('No such person.');
	    return;		    
	} else {
	    if (!(instructor.githubAccessToken)) {
		res.status(500).send('Instructor is not linked to GitHub.');
		return;
	    } else {
		var github = new githubApi({version: "3.0.0"});
		
		github.authenticate({
		    type: "oauth",
		    token: instructor.githubAccessToken
		});

		// BADBAD: check if a user is a collaborator
		github.user.get({}, function(err, githubUser) {
		    if (err) {
			res.status(500).send(err);
			return;
		    } else {
			var githubId = githubUser.id;

			github.repos.getCollaborator({user: owner, repo: repo, collabuser: githubUser.login}, function(err, collaborators) {
			    if (err) {
				res.status(500).send(err);
				return;
			    } else {
				// No error means we're a collaborator

				mdb.Branch.find( { owner: owner, repository: repo },
						 { commit: 1, _id: 0 },
						 function(err, branches) {
						     if (err) {
							 res.status(500).send(err);
							 return;						 
						     } else {
							 var commits = branches.map( function(branch) { return branch.commit; } );
							 
							 // BADBAD: REALLY should add and uniqueify here, otherwise we're clobbering old hashes
							 var hash = { instructor: commits };
							 
							 mdb.User.update( {_id: instructor._id }, {$set: hash},
									  function(err, document) {
									      if (err)
										  res.status(500).send(err);
									      else
										  res.status(200).json(commits);
									  });
						     }
						 });
			    }
			});
		    }			
		});
	    }
	}
    });
};

exports.index = function(req, res) {
    var page = req.params.page;
    var pageSize = 10;
    var pageCount = 1;

    if (!(('user' in req) && (req.user.superuser))) {
	res.status(403).render('fail', { title: "Users not visible", message: "You are not a superuser." });
	return;
    }
    
    async.waterfall(
	[
	    function(callback) {
		mdb.User.count( callback );
	    },
	    function(userCount, callback) {
		pageCount = Math.ceil( userCount / pageSize );
		
		mdb.User.find()
		    .skip( (page-1)*pageSize )
		    .limit( pageSize )
		    .sort('-lastSeen')
		    .exec( callback );
	    },
	], function(err, users) {
	    if (err) {
		res.status(500).send(err);
	    } else {
		users.forEach( function(user) {
		    if (user.email)
	    		user.gravatar = crypto.createHash('md5').update(validator.normalizeEmail(user.email)).digest("hex");
		});
		
		res.render('user/index', {
		    users: users,
		    page: page,
		    pageCount: pageCount
		} );    		
	    }
	});
};
