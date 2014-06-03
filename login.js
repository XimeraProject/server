var GoogleStrategy = require('passport-google').Strategy
  , CourseraOAuthStrategy = require('./passport-coursera-oauth').Strategy
  , LtiStrategy = require('./passport-lti').Strategy
  , async = require('async')
  , mdb =  require('./mdb')
  , path = require('path');

module.exports.courseraStrategy = function (rootUrl) {
    return new CourseraOAuthStrategy({
        requestTokenURL: 'https://authentication.coursera.org/auth/oauth/api/request_token',
        accessTokenURL: 'https://authentication.coursera.org/auth/oauth/api/access_token',
        consumerKey: process.env.COURSERA_CONSUMER_KEY,
        consumerSecret: process.env.COURSERA_CONSUMER_SECRET,
        callbackURL: rootUrl + "/auth/coursera/callback",
        passReqToCallback: true
    }, function(req, token, tokenSecret, profile, done) {
        addUserAccount(req, 'courseraOAuthId', profile.id, profile.full_name, null, null, done);
    });
}

module.exports.googleStrategy = function (rootUrl) {
    return new GoogleStrategy({
        returnURL: rootUrl + '/auth/google/return',
        realm: rootUrl,
        passReqToCallback: true
    }, function (req, identifier, profile, done) {
        addUserAccount(req, 'googleOpenId', identifier, profile.displayName, profile.emails[0].value, null, done);
    });
}

module.exports.ltiStrategy = function (rootUrl) {
    return new LtiStrategy({
        returnURL: '/just-logged-in',
        consumerKey: process.env.LTI_KEY,
        consumerSecret: process.env.LTI_SECRET,
    }, function (req, identifier, profile, done) {
	var displayName = profile.lis_person_name_full;
	var email = profile.lis_person_contact_email_primary;
        addUserAccount(req, 'ltiId', identifier, displayName, email, profile.custom_ximera, done);
    });
}

// Add guest users account if not logged in.
// TODO: Clean these out occasionally.
module.exports.guestUserMiddleware = function(req, res, next) {
    if (!req.user) {
        if (!req.session.guestUserId) {
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
        }
        else {
            mdb.User.findOne({_id: req.session.guestUserId}, function (err, user) {
                if (err) {
                    next(err);
                }
                else if (user) {
                    req.user = user;
                    next();
                }
                else {
                    console.log(req.session.guestUserId);
                    req.session.guestUserId = null;
                    next("Unable to find guest user.");
                }
            });
        }
    }
    else {
        req.session.guestUserId = null;
        next();
    }
};


function addUserAccount(req, authField, authId, name, email, course, done) {
    var searchFields = {};
    searchFields[authField] = authId;

    if (req.user.isGuest) {
    	// Save this to the users collection if we haven't already
    	mdb.User.findOneAndUpdate(searchFields, {
            name: name,
	    email: email,
	    course: course
        }, {
            new: true
        }, function(err, user) {
            if (err) {
                done(err, null);
            }
            else {
                if (!user) {
                    // New user, modify current user account instead.
                    req.user.name = name;
                    req.user.email = email;
                    req.user.course = course;
                    req.user[authField] = authId;
                    req.user.isGuest = false;
                    req.user.save(function (err) {
                        done(err, req.user)
                    });
                }
                else {
                    done(null, user);
                }
            }
    	});
    }
    else {
        // Add account to existing user; remove account from other users.

        // If user already has account, we're done.
        if (req.user[authField] == authId) {
            done(null, req.user)
        }
        else {
            mdb.User.find(searchFields, function (err, users) {
                async.eachSeries(users, function (user, callback) {
                    user[authField] = null;
                    user.save(callback);
                }, function (err) {
                    if (err) {
                        done(err, null);
                    }
                    else {
                        req.user[authField] = authId;
                        req.user.save(function (err) {
                            done(err, req.user);
                        })
                    }
                })
            });
        }
    }
}
