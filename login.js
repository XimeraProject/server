var GoogleStrategy = require('passport-google-openidconnect').Strategy
  , TwitterStrategy = require('passport-twitter').Strategy
  , LocalStrategy = require('passport-local').Strategy
  , LtiStrategy = require('./passport-lti').Strategy
  , OAuth2Strategy = require('passport-oauth2').Strategy
  , async = require('async')
  , mdb =  require('./mdb')
  , githubApi = require('github')
  , path = require('path');

module.exports.githubStrategy = function(rootUrl) {
    return new OAuth2Strategy({
	authorizationURL: 'https://github.com/login/oauth/authorize',
	tokenURL: 'https://github.com/login/oauth/access_token',
	clientID: process.env.GITHUB_CLIENT_ID,
	clientSecret: process.env.GITHUB_CLIENT_SECRET,
	scope: "repo:status,public_repo,repo_deployment,write:repo_hook",
	callbackURL: rootUrl + "/auth/github/callback",
	passReqToCallback: true
    }, function(req, accessToken, refreshToken, profile, done) {
        // Load the github user id				
	var github = new githubApi({version: "3.0.0"});
	github.authenticate({
	    type: "oauth",
	    token: accessToken
	});

	github.user.get( {}, function( err, user ) {
	    // TODO: save the entire user object here?

	    // Login using the github user id
	    addUserAccount(req, 'githubId', user.id, null, null, null, function() {
		// Save the github access token
		req.user.githubAccessToken = accessToken;
		req.user.save(done);
	    });
	});
    });
}

module.exports.googleStrategy = function (rootUrl) {
    return new GoogleStrategy({
        callbackURL: rootUrl + '/auth/google/callback',
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	scope: "email",
        passReqToCallback: true
    }, function(req, iss, sub, profile, accessToken, refreshToken, done) {
	console.log( "google profile = ", profile );
        addUserAccount(req, 'googleOpenId', profile.id, profile.displayName, null, null, done);
	console.log( "user = " + JSON.stringify(req.user) );
    });
}

module.exports.twitterStrategy = function(rootUrl) {
    return new  TwitterStrategy({
	consumerKey: process.env.TWITTER_CONSUMER_KEY,
	consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
	callbackURL: rootUrl + "/auth/twitter/callback",
	passReqToCallback: true
    }, function(req, token, tokenSecret, profile, done) {
	if (profile._json) profile = profile._json;
        addUserAccount(req, 'twitterOAuthId', profile.id_str, profile.name, null, null, done);
    });
}

module.exports.localStrategy = function(rootUrl) {
    return new  LocalStrategy({
	passReqToCallback: true
    }, function(req, username, password, done) {
	// This is horrible, but at least it lets me check the login...
        // addUserAccount(req, 'password', password, username, null, null, done);
	
    	mdb.User.findOne({ username: username }, function(err, user) {
	    if (err) { return done(err); }
	    if (!user) { return done(null,false); }
	    // BADBAD: password should be hashed
	    if (user.password != password) { return done(null,false); }
	    req.user = user;
	    return done(null, user);
	});
    });
}

// DEPRECATED: should use the /lms endpoint instead
module.exports.ltiStrategy = function (rootUrl) {
    return new LtiStrategy({
        returnURL: '/just-logged-in',
        consumerKey: process.env.LTI_KEY,
        consumerSecret: process.env.LTI_SECRET,
    }, function (req, identifier, profile, done) {
	var displayName = 'Remote User';

	console.log( "LTI ****************" );
	console.log( profile );

	if ('lis_person_name_full' in profile)
	    displayName = profile.lis_person_name_full;
	var email = '';

	if ('lis_person_contact_email_primary' in profile)	
	    email = profile.lis_person_contact_email_primary;

        addUserAccount(req, 'ltiId', identifier, displayName, email, profile.custom_ximera, done);
    });
};


module.exports.lmsStrategy = function (rootUrl) {
    return new LtiStrategy({
        returnURL: '/just-logged-in',
        consumerKey: process.env.LTI_KEY,
        consumerSecret: process.env.LTI_SECRET,
    }, function (req, identifier, profile, done) {
        addLmsAccount(req, identifier, profile, done);
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
                        done(err, req.user);
                    });
                }
                else {
		    // BADBAD: it might be nice to copy over the guest
		    // data to the existing user account, but I'm so
		    // terrified of merging users.
                    done(null, user);
                }
            }
    	});
    } else {
        // Add account to existing user; remove account from other users.

        // If user already has account, we're done.
        if (req.user[authField] == authId) {
	    req.user.name = name;
	    req.user.email = email;
	    req.user.course = course;
            req.user[authField] = authId;
            req.user.save(function (err) {
		console.log( authField, authId );
		console.log( JSON.stringify( req.user ) );
                done(err, req.user);
            });
        }
        else {
	    // Merge any existing accounts

	    // Find any OTHER accounts (but there can be at most one)
            mdb.User.findOne(searchFields, function (err, user) {
		if (err) {
		    done( err, null );
		} else {
		    async.series( [
			function(callback) {
			    if (user) {
				user.replacedBy = req.user._id;

				// Copy over OTHER login details (without clobbering any existing details)
				user[authField] = undefined;

				var authFields = ['googleOpenId', 'courseraOAuthId', 'twitterOAuthId', 'ltiId', 'githubId'];
				authFields.forEach( function(authField) {
				    if (user[authField] && !(req.user[authField])) {
					req.user[authField] = user[authField];
					user[authField] = undefined;
				    }
				});

				// Copy over xake credentials
				if (user.isAuthor) {
				    req.user.isAuthor = true;
				}
				if (!(req.user.apiKey)) {
				    req.user.apiKey = user.apiKey;
				    user.apiKey = undefined;
				}
				if (!(req.user.apiSecret)) {
				    req.user.apiSecret = user.apiSecret;
				    user.apiSecret = undefined;
				}
				
				user.save(callback);
			    } else {
				callback(null);
			    }
			},

			function(callback) {
			    // Update user data
			    req.user.name = name;
			    req.user.email = email;
			    req.user.course = course;
			    req.user[authField] = authId;
			    
			    req.user.save(callback);
			},

			function(callback) {
			    if (user && user._id) {
				mdb.State.update( { user: user._id },
						  { $set: { user: req.user._id } },
						  { multi: true },						  
						  callback );
			    } else {
				callback(null);
			    }
			},

			function(callback) {
			    if (user && user._id) {			
				mdb.Completion.update( { user: user._id },
						       { $set: { user: req.user._id } },
						       { multi: true },
						       callback );
			    } else {
				callback(null);
			    }
			}

		    ], function(err, results) {
                        done(err, req.user);			
		    });
		}
	    });
        }
    }
}

// Test this with  http://lti.tools/test/tc.php
function addLmsAccount(req, identifier, profile, done) {
    console.log(profile);
    
    async.waterfall( [
	// See if we have already logged in with this identifier	
	function(callback) {
	    console.log("Looking up bridge for ", identifier);
	    mdb.LtiBridge.findOne( {ltiId: identifier}, callback );	    
	},
	// Create a bridge if we aren't already logged in
	function(bridge, callback) {
	    console.log("Found bridge = ", bridge);
	    if (bridge) {
		// use this bridge
		callback(null,bridge);
	    } else {
		// make a new bridge
		bridge = new mdb.LtiBridge({
                    user: req.user._id,
		    ltiId: identifier,
		    data: profile
		});
		console.log("new bridge =", bridge);
		bridge.save(function(err) {
		    if (err)
			callback(err);
		    else
			callback(null,bridge);
		});
	    }
	},
	// Update the current user object
	function(bridge,callback) {
	    var updates = { isGuest: false };

	    if ('lis_person_name_full' in profile)
		updates.name = profile.lis_person_name_full;

	    if ('lis_person_contact_email_primary' in profile)	
		updates.email = profile.lis_person_contact_email_primary;

    	    mdb.User.findOneAndUpdate({_id: bridge.user},
				      updates,
				      callback);
	}
    ], function(err, result) {
	if (err)
	    done(err,null);
	else {
	    var user = result;
	    user.course = '/' + profile.custom_repository + '/' + profile.custom_xourse;
	    console.log("lms with user._id =", result._id);
	    done(null, result);
	}
    });
}
