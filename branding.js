var ip = require('ip');
var _ = require('underscore');

var subnets = [ip.cidrSubnet('164.107.0.0/16'),
	       ip.cidrSubnet('140.254.0.0/16'),
	       ip.cidrSubnet('128.146.0.0/16'),
	       ip.cidrSubnet('192.68.143.0/24'),
	       ip.cidrSubnet('192.12.205.0/24')];

exports.middleware = function(req, res, next) {
    var remoteAddress = req.headers['x-forwarded-for'] || 
	    req.connection.remoteAddress || 
	    req.socket.remoteAddress ||
	    req.connection.socket.remoteAddress;

    if (_.some( subnets, function(subnet) { return subnet.contains(remoteAddress); } ))
	res.locals.atOhioState = true;
    else
	res.locals.atOhioState = false;	
    
    next();
};
