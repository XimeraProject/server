var util = require('util')
  , passport = require('passport')
  , _ = require('underscore')
  , lti = require("ims-lti");

function LtiStrategy(options, verify) {
    this.name = 'lti'
    this.provider = new lti.Provider(options.consumerKey, options.consumerSecret);
    passport.Strategy.call(this, options, verify);
}

util.inherits(LtiStrategy, passport.Strategy);

LtiStrategy.prototype.authenticate = function(req) {
    // I'm behind nginx so it looks like I'm serving http, but as far as the rest of the world is concerned, it's https
    var myRequest = _.extend({}, req, {protocol: 'https'});
    var self = this;

    this.provider.valid_request(myRequest, function(err, isValid) {
	if (!isValid) {
	    return self.error(err);
	}

	self.success(req.body);
    });
}

module.exports.Strategy = LtiStrategy;


