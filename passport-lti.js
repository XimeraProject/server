var util = require('util')
  , passport = require('passport')
  , _ = require('underscore')
  , lti = require("ims-lti");

function LtiStrategy(options, verify) {
    this.name = 'lti'  
    this._verify = verify;
    this.provider = new lti.Provider(options.consumerKey, options.consumerSecret);
    passport.Strategy.call(this, options, verify);
}

util.inherits(LtiStrategy, passport.Strategy);

LtiStrategy.prototype.authenticate = function(req) {
    // I'm behind nginx so it looks like I'm serving http, but as far as the rest of the world is concerned, it's https
    var myRequest = _.extend({}, req, {protocol: 'https'});
    var self = this;
    
    function verified(err, user, info) {
	if (err) { return self.error(err); }
	if (!user) { return self.fail(info); }
	self.success(user, info);
    }

    slf.provider.valid_request(myRequest, function(err, isValid) {
	if (!isValid) {
	    return self.error(err);
	} else {
	    self._verify( req, 'identifier', 'profile', verified );
	}
    });
}

module.exports.Strategy = LtiStrategy;


