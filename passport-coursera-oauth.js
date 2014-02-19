var util = require('util')
  , passport = require('passport')
  , OAuthStrategy = require('passport-oauth').OAuthStrategy;

module.exports.Strategy = function(options, verify) {
    if (!options.userAuthorizationURL) {
        // Placeholder to avoid initialization check, replaced in auth.
        options.userAuthorizationURL = "http://www.google.com/";
    }
    OAuthStrategy.call(this, options, verify);

}

util.inherits(module.exports.Strategy, OAuthStrategy);

module.exports.Strategy.prototype.authenticate = function(req, options) {
    // We have to intercept this particular spot in the request process and set the authorization url, since Coursera
    // doesn't use a static one, and instead provides it in the request token response..
    var prevGetOAuthRequestToken = this._oauth.getOAuthRequestToken;
    var self = this;
    this._oauth.getOAuthRequestToken = function(params, callback) {
        prevGetOAuthRequestToken.call(self._oauth, params, function (err, token, tokenSecret, params) {
            console.log(util.inspect(params));
            self._userAuthorizationURL = params.authentication_url;
            // Coursera uses non-standard variable name for oauth_secret, so we have to pull it out of parameters here.
            callback(err, token, params.oauth_secret, params);
        });
    }

    OAuthStrategy.prototype.authenticate.call(this, req, options);
};

module.exports.Strategy.prototype.userProfile = function(token, tokenSecret, params, done) {
    this._oauth.get('https://authentication.coursera.org/auth/oauth/api/get_identity', token, tokenSecret, function(err, data, res) {
        var profile = JSON.parse(data);
        done(err, profile);
    });
};
