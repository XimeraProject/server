
/*
 * GET users listing.
 */

var crypto = require('crypto');
var mongo = require('mongodb');

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

exports.get = function(req, res){
    var id = req.params.id;

    req.db.users.findOne({_id: new mongo.ObjectID(id)}, function(err,document) {
        if (document) {
	    if ('emails' in document)
		document.gravatar = crypto.createHash('md5').update(document.emails[0]).digest("hex");

	    // Superusers can edit anyone; users can edit themselves
	    var editable = ('user' in req) && (req.user.superuser || (req.user._id === document._id));

	    res.render('user', { person: document, user: req.user, editable: editable, title: document.name });
        }
        else {
	    res.status(404).render('fail', { title: "User not found", error: "I could not find a user with that ID." });
        }
    });
};

exports.put = function(req, res){
    var id = req.params.id;

    if ( ('user' in req) && (req.user.superuser || (req.user._id === document._id)) ) {
	hash = {};
	hash[req.body.name] = req.body.value;
	console.log( hash );

	req.db.users.update({_id: new mongo.ObjectID(id)}, {$set: hash},
			    function( err, document) {
				if (document) {
				    res.send(200);
				} else {
				    res.send(500);
				}
			    });
    } else {
	res.send(403);
    }

};
