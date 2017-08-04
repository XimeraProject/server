var mdb = require('../mdb');

function createGuestUser( req, res, next ) {
    var userAgent = req.headers['user-agent'];
    var remoteAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
	
    req.user = new mdb.User({
        isGuest: true,
        name: "Guest User",
        userAgent: userAgent,
        remoteAddress: remoteAddress
    });
    req.session.guestUserId = req.user._id;
    req.user.save(next);
};

// Add guest users account if not logged in.
// TODO: Clean these out occasionally.
module.exports.middleware = function(req, res, next) {
    
    // If we are already logged in legitimately...
    if (req.user) {
	// Then forgot this guest user nonsense.
        req.session.guestUserId = null;
        next();
	return;
    }

    // If we've already created a guest account... 
    if (req.session.guestUserId) {
	// attempt to load it
        mdb.User.findOne({_id: req.session.guestUserId}, function (err, user) {
            if (err) {
                next(err);
            }
            else if (user) {
                req.user = user;
                next();
            }
            else {
                req.session.guestUserId = null;
		createGuestUser( req, res, next );		
            }
        });
	
    } else {
	createGuestUser( req, res, next );
    }
};

