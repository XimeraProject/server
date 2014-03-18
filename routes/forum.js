/*
 * GET users listing.
 */
module.exports = function(io) {
    var routes = {};
    var mongo = require('mongodb');	
    var mdb = require('../mdb');
    var _ = require('underscore');
	
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
	var room = req.params[0];
	
	// BADBAD: It is possible to miss posts this way, since two posts might have the same timestamp
	mdb.Post.find({ $query: {room: room}, $orderby: { date : 1 } }, function(err,document) {
            if (document) {
		
		var i;
		for( i=0; i<document.length; i++ ) {
		    if (document[i].user._id.toString() != req.user._id.toString())
			document[i].user._id = 'notcurrentuser';
		}

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

	// The increment fails (?) if the addToSet fails because the user already upvoted?
	mdb.Post.update({_id: new mongo.ObjectID(postId)}, {$addToSet: {upvoters: req.user._id}, $inc: {upvotes: 1}},
			function( err, document ) {
			    if (err)
				res.json(0);
			    else
				res.json(1);
			});

	return;
    }
    
    routes.flag = function(req, res) {
	var postId = req.params.post;
	
	if (!req.user) {
	    res.json(0);
	    return;
	}

	if (req.user.isGuest) {
	    res.json(0);
	    return;
	}

	// The increment fails (?) if the addToSet fails because the user already flagd?
	mdb.Post.update({_id: new mongo.ObjectID(postId)}, {$addToSet: {flaggers: req.user._id}, $inc: {flags: 1}},
			function( err, document ) {
			    if (err)
				res.json(0);
			    else
				res.json(1);
			});

	return;
    }
    
    routes.put = function(req, res) {
	var postId = req.params.post;
	
	if (!req.user) {
            res.status(500).send('Need to login.');
	    return;
	}

	if (req.user.isGuest) {
            res.status(500).send('Need to login.');
	    return;
	}

	mdb.Post.findOne({_id: postId} , function(err,post) {
            if (post) {
		// BADBAD: why is toString() needed here?
		if (post.user._id.toString() != req.user._id.toString()) {
		    res.status(500).send('You are not permitted to edit the posts of other people.');
		    return;
		}

		post = _.extend( post, { content: req.body.content, date: Date.now(),
					user: { _id: req.user._id,
						name: req.user.name } 
				      } );

		if (('email' in req.user) && (req.user.email != null)) {
		    var userEmail = req.user.email;
		    post.user.gravatar = crypto.createHash('md5').update(userEmail).digest("hex");
		} else {
		    post.user.gravatar = crypto.createHash('md5').update(req.user._id.toString()).digest("hex");
		}

		if (req.body.anonymously) {
		    post.user.anonymously = true;
		    post.user.name = 'Anonymous';
		    post.user.gravatar = '';
		}

		var room = post.room;

		io.sockets.in(room).emit('post', post);

		post.save(function(err, document){
		    if (document) {
			res.json([document]);
		    } else {
			res.status(500).send(err);
		    }
		});
            }
            else {
		res.status(500).send('Could not find post.');
		return;
            }
	});
    }


    routes.delete = function(req, res) {
	var postId = req.params.post;
	
	if (!req.user) {
            res.status(500).send('Need to login.');
	    return;
	}

	if (req.user.isGuest) {
            res.status(500).send('Need to login.');
	    return;
	}

	mdb.Post.findOne({_id: postId} , function(err,post) {
            if (post) {
		// BADBAD: why is toString() needed here?
		if (post.user._id.toString() != req.user._id.toString()) {
		    res.status(500).send('You are not permitted to delete the posts of other people.');
		    return;
		}

		post.content = 'deleted!';

		post = _.extend( post, { content: '', date: Date.now(),
					 user: {}
				       } );

		var room = post.room;

		io.sockets.in(room).emit('post', post);

		mdb.Post.remove({_id: postId}, true);
		res.status(200).send('Deleting post.');
            }
            else {
		res.status(500).send('Could not find post.');
		return;
            }
	});
    }
    
    routes.post = function(req, res) {
	var room = req.params[0];
	var userName = 'anonymous';
	var userEmail = '';
	
	if ('user' in req) {
	    userName = req.user.name;
	}
	
	if (!req.user) {
            res.status(500).send('Need to login.');
	    return;
	}

	if (req.user.isGuest) {
            res.status(500).send('Need to login.');
	    return;
	}

	var post = mdb.Post({ room: room,
			      date: Date.now(),
			      content: req.body.content,
			      upvoters: [],
			      upvotes: 0,
			      flaggers: [],
			      flags: 0,
			      user: { _id: req.user._id,
				      name: req.user.name,
				      },
			    });


	if (('email' in req.user) && (req.user.email != null)) {
	    var userEmail = req.user.email;
	    post.user.gravatar = crypto.createHash('md5').update(userEmail).digest("hex");
	} else {
	    post.user.gravatar = crypto.createHash('md5').update(req.user._id.toString()).digest("hex");
	}

	if (req.body.anonymously) {
	    post.user.anonymously = true;
	    post.user.name = 'Anonymous';
	    post.user.gravatar = '';
	}

	if (('parent' in req.body) && (req.body.parent.length > 0)) {
	    post.parent = req.body.parent;
	}

	io.sockets.in(room).emit('post', post);

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

