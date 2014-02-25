/*
 * GET users listing.
 */
module.exports = function(io) {
    var routes = {};
    var mongo = require('mongodb');	
    var mdb = require('../mdb');
	
    var crypto = require('crypto');

    routes.view = function(req, res) {
	var room = req.params.room;
	
	mdb.Post.find({room: room} , function(err,document) {
            if (document) {
		res.render('room', { title: 'Room', user: req.user, room: room, posts: document });
            }
            else {
		res.render('room', { title: 'Room', user: req.user, room: room, posts: null });
            }
	});
    }
    
    routes.get = function(req, res){
	var room = req.params.room;
	
	// BADBAD: It is possible to miss posts this way, since two posts might have the same timestamp
	mdb.Post.find({ $query: {room: room}, $orderby: { date : 1 } }, function(err,document) {
            if (document) {
		res.json(document);
            }
            else {
		// If there is nothing in the database, give the client an empty array
		res.json([]);
            }
	});
    }
    
    routes.upvote = function(req, res) {
	var postId = req.params.post;
	
	if (!req.user) {
	    res.json(0);
	    return;
	}

	if (req.user.isGuest) {
	    res.json(0);
	    return;
	}

	mdb.Post.update({_id: new mongo.ObjectID(postId)}, {$addToSet: {upvotes: req.user._id}},
			function( err, document ) {
			    if (err)
				res.json(0);
			    else
				res.json(1);
			});

	return;
    }
    
    
    routes.post = function(req, res) {
	var room = req.params.room;
	var userName = 'anonymous';
	var userEmail = '';
	
	if ('user' in req) {
	    userName = req.user.name;
	}
	
	if (!req.user) {
            res.status(500).send('Need to login.');
	}

	if (req.user.isGuest) {
            res.status(500).send('Need to login.');
	}

	var post = mdb.Post({ room: room,
			      date: Date.now(),
			      content: req.body.content,
			      upvotes: [],
			      user: { _id: req.user._id,
				      name: req.user.name },
			    });
	
	if ('emails' in req.user) {
	    var userEmail = req.user.emails[0];
	    post.user.gravatar = crypto.createHash('md5').update(userEmail).digest("hex");
	}

	if (('parent' in req.body) && (req.body.parent.length > 0)) {
	    post.parent = req.body.parent;
	}

	console.log( "post to", room, "The data", post );
	io.sockets.in(room).emit('post', post);

	console.log( post );

	post.save(function(err, document){
            if (document) {
		res.json([document]);
            } else {
		res.status(500).send(err);
	    }
	});
    }
    
    return routes;
};

