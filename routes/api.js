
/*
 * GET users listing.
 */

var crypto = require('crypto');
var mongo = require('mongodb');
var mdb = require('../mdb');
var remember = require('../remember');

exports.authenticateViaHMAC = function(req, res, next) {
    var authorization = req.header("Authorization");
    
    if (!authorization) {
	next();
	return;
    }
	
    authorization = authorization.replace(/^Ximera /,'');
    var key = authorization.replace(/:.*$/,'');
    var desiredHash = authorization.replace(/^.*:/,'');

    mdb.User.findOne({apiKey: key}, function(err,user) {
	var hmac = crypto.createHmac("sha256", user.apiSecret);
	hmac.setEncoding('hex');
	hmac.write(req.method + " " + req.path + "\n");
	hmac.end(req.rawBody, function() {
	    var hash = hmac.read();
	    if (hash == desiredHash) {
		req.user = user;
		next();
	    } else {
    		res.status(401).json("Forbidden.");
	    }
	});
    });    
}

exports.xake = function(req, res){
    res.status(200).json(req.user);
};

exports.putActivity = function(req, res){
    var commit = req.params.commit;
    var path = req.params.path;

    //console.log( req.rawBody );
    
    res.status(200).json("Got it.");
};
