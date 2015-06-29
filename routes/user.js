
/*
 * GET users listing.
 */

var crypto = require('crypto');
var mongo = require('mongodb');
var mdb = require('../mdb');
var remember = require('../remember');

exports.list = function(req, res){
    if (('user' in req) && (req.user.superuser)) {
	req.db.users.find(function(err,document) {
            if (document) {
		res.render('users', { users: document, title: 'users' });
	    } else {
		res.status(500).render('fail', { title: "Users not found", error: "I could not find any users." });
	    }
	});
    } else {
	res.status(403).render('fail', { title: "Users not visible", error: "You are not a superuser." });
    }
};

exports.getCurrent = function(req, res){
    if (!req.user) {
	res.json(0);
	return;
    }

    req.user.gravatar = crypto.createHash('md5').update(req.user.email).digest("hex");
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
    req.db.users.update({ _id: new mongo.ObjectID(id),
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

    // BADBAD: should include more nuanced security here
    if (req.user._id.toString() != id) {
        res.status(500).send('No permission to access other users.');
	return;	
    }

    // Add one view to the count of profileViews
    req.db.users.update({_id: new mongo.ObjectID(id)},
			{ $inc: { profileViews: 1 } });
    
    req.db.users.findOne({_id: new mongo.ObjectID(id)}, function(err,document) {
        if (document) {
	    
	    //if ('email' in document)
	    //	document.gravatar = crypto.createHash('md5').update(document.email).digest("hex");

	    res.format({
		html: function(){
		    remember(req);
		    
		    res.render('user/profile', { userId: req.params.id,
						 user: req.user,
						 script: "user/profile",
						 person: document,
						 editable: true,
						 title: 'Profile' } );
		},

		json: function(){
		    res.json(document);
		}
	    });
        }
        else {
	    res.status(404).json({});
        }
    });
};

exports.put = function(req, res){
    var user = req.body.user;

    // If this is an x-editable update
    if ('pk' in req.body) {
	console.log( req.user._id.toString() );
	console.log( req.body.pk );

	// Could you 
	if ((req.user._id.toString() !== req.body.pk) && (!req.user.superuser)) {
	    res.status(403).send('You are not permitted to edit this user.');
	    return;
	}
	
	var hash = {};

	if (req.body.name == "location")
	    hash['location'] = req.body.value;

	if (req.body.name == "name") {
	    hash['name'] = req.body.value;

	    if ( ! (/[A-z]/.test(hash['name']))) {
		res.status(403).send('Your name must contain some letters.');
		return;		
	    }
	}
	    
	if (req.body.name == "displayName")
	    hash['displayName'] = req.body.value;

	if (req.body.name == "privacy")
	    hash['privacy'] = req.body.value;	
	    
	if (req.body.name == "birthday")
	    hash['birthday'] = req.body.value;
	
	mdb.User.update( {_id: new mongo.ObjectID(req.body.pk)}, {$set: hash},
			 function(err, document) {
			     if (err)
				 res.send(500);
			     
			     res.send(200);
			 });

	return;
	
    } else {
	res.send(404);
    }
    
    if (!req.user) {
	res.send(401);
    }

    if (req.user.superuser || (req.user._id == user._id)) {
	var id = user._id;

	var hash = {};

	if ('email' in user)
	    hash['email'] = user.email;

	if ('displayName' in user)
	    hash['displayName'] = user.displayName;

	if ('website' in user)
	    hash['website'] = user.website;

	if ('location' in user)
	    hash['location'] = user.location;

	if ('biography' in user)
	    hash['biography'] = user.biography;

	if ('birthday' in user)
	    hash['birthday'] = user.birthday;

	console.log( hash );

	mdb.User.update( {_id: new mongo.ObjectID(id)}, {$set: hash},
			 function(err, document) {
			     if (err)
				 res.send(500);
			     
			     res.send(200);
			 });
    } else {
	res.send(404);
    }
};
