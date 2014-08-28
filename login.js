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
	var displayName = 'Remote User';

	if ('lis_person_name_full' in profile)
	    displayName = profile.lis_person_name_full;
	var email = '';

	if ('lis_person_contact_email_primary' in profile)	
	    email = profile.lis_person_contact_email_primary;

        addUserAccount(req, 'ltiId', identifier, displayName, email, profile.custom_ximera, done);
    });
}

// POST&https%3A%2F%2Fximera.osu.edu%2Flti%2F&basiclti_submit%3DLaunch%2520Endpoint%2520with%2520BasicLTI%2520Data%26context_id%3D11395970%26context_label%3Dmath_2162.02_au2014_20577%26context_title%3DAU14%2520MATH%25202162.02%2520-%2520Acc%2520Eng%2520Calc%25202%2520%252820577%2529%26context_type%3D%26custom_ximera%3Dkisonecat%252Fmultivariable-calculus%26ext_d2l_link_id%3D216%26ext_d2l_role%3D.Student%26ext_d2l_token_digest%3DHySPKFZ9SEdVLiThi0Tp2Um3EEI%253D%26ext_d2l_token_id%3D163319336%26ext_d2l_username%3Dfowler.291%26ext_tc_profile_url%3Dhttps%253A%252F%252Fcarmen.osu.edu%252Fd2l%252Fapi%252Fext%252F1.0%252Flti%252Ftcservices%26launch_presentation_locale%3DEN-US__%26lis_outcome_service_url%3Dhttps%253A%252F%252Fcarmen.osu.edu%252Fd2l%252Fle%252Flti%252FOutcome%26lis_person_contact_email_primary%3Dfowler.291%2540osu.edu%26lis_person_name_family%3DFowler%26lis_person_name_full%3DJames%2520Fowler%26lis_person_name_given%3DJames%26lis_result_sourcedid%3D4938ea27-4cd5-4fec-a6f6-3d6e141c1948%26lti_message_type%3Dbasic-lti-launch-request%26lti_version%3DLTI-1p0%26oauth_callback%3Dabout%253Ablank%26oauth_consumer_key%3D8SoyJOxqroPZ1t3CyG%26oauth_nonce%3D283323381%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1409110801%26oauth_version%3D1.0%26resource_link_description%3D%26resource_link_id%3D%26resource_link_title%3DXimera%26roles%3DInstructor%26tool_consumer_info_product_family_code%3Ddesire2learn%26tool_consumer_info_version%3D10.3.0%2520SP4%26tool_consumer_instance_contact_email%3D%26tool_consumer_instance_description%3D%26tool_consumer_instance_guid%3D%26tool_consumer_instance_name%3D%26user_id%3DOSU_Prod_499871

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
                    user[authField] = undefined;
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
