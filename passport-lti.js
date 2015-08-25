var util = require('util')
  , passport = require('passport')
  , _ = require('underscore')
  , lti = require("ims-lti");

function LtiStrategy(options, verify) {
    this.name = 'lti'  
    this._verify = verify;
    this.returnURL = options.returnURL;
    this.provider = new lti.Provider(options.consumerKey, options.consumerSecret);
    passport.Strategy.call(this, options, verify);
}

util.inherits(LtiStrategy, passport.Strategy);

LtiStrategy.prototype.authenticate = function(req) {
    
    // I'm behind nginx so it looks like I'm serving http, but as far as the rest of the world is concerned, it's https
    var protocol = 'https';
    if (req.get('host') == 'localhost:3000') {
	protocol = 'http';
	console.log( protocol );
    }

    var myRequest = _.extend({}, req, {protocol: protocol});
    var self = this;
    
    function verified(err, user, info) {
	if (err) { return self.error(err); }
	if (!user) { return self.fail(info); }
	self.success(user, info);
	
	/*
	if (self.returnURL)
	    self.redirect( self.returnURL );
	    */
    }

    self.provider.valid_request(myRequest, function(err, isValid) {
	if (!isValid) {
	    return self.error(err);
	} else {
	    var profile = req.body;
	    // An LTI user may end up taking a course multiple times, but we want a fresh experience each time
	    var identifier = profile.user_id + '-' + profile.context_id;
	    self._verify( req, identifier, profile, verified );
	}
    });
}

module.exports.Strategy = LtiStrategy;

