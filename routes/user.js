
/*
 * GET users listing.
 */

var crypto = require('crypto');
var mongo = require('mongodb');
var mdb = require('../mdb');

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

    req.user.gravatar = crypto.createHash('md5').update(req.user.emails[0]).digest("hex");
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

exports.get = function(req, res){
    var id = req.params.id;

    if (!req.user) {
	res.send(401);
    }

    // BADBAD: should include more nuanced security here
    if (req.user._id.toString() != user._id.toString()) {
        res.status(500).send('No permission to access other users.');
	return;	
    }
	
    req.db.users.findOne({_id: new mongo.ObjectID(id)}, function(err,document) {
        if (document) {
	    if ('emails' in document)
		document.gravatar = crypto.createHash('md5').update(document.emails[0]).digest("hex");

	    res.json(document);
        }
        else {
	    res.status(404).json({});
        }
    });
};

exports.put = function(req, res){
    var user = req.body.user;

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
