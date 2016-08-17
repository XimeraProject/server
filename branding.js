var ip = require('ip');
var _ = require('underscore');

var brandings = {
    "localhost": [ip.cidrSubnet('127.0.0.0/8')],
    "The Ohio State University": [ip.cidrSubnet('164.107.0.0/16'),
				  ip.cidrSubnet('140.254.0.0/16'),
				  ip.cidrSubnet('128.146.0.0/16'),
				  ip.cidrSubnet('192.68.143.0/24'),
				  ip.cidrSubnet('192.12.205.0/24')],
    "Colorado State University": [ip.cidrSubnet('129.82.0.0/16')]
};


exports.middleware = function(req, res, next) {
    var remoteAddress = req.headers['x-forwarded-for'] || 
	    req.connection.remoteAddress || 
	    req.socket.remoteAddress ||
	    req.connection.socket.remoteAddress;
    try {
	res.locals.places = [];

	Object.keys(brandings).forEach( function(place) {
	    if (_.some( brandings[place], function(subnet) { return subnet.contains(remoteAddress); } )) {
		res.locals.places.push( place );
	    }
	});
	
	if (res.locals.places.indexOf( "The Ohio State University" ) >= 0)
	    res.locals.atOhioState = true;
	else
	    res.locals.atOhioState = false;

	if (res.locals.places.indexOf( "Colorado State University" ) >= 0)
	    res.locals.atColoradoState = true;
	else
	    res.locals.atColoradoState = false;
    }
    catch (e) {
	res.locals.places = [];
	res.locals.atOhioState = false;
    }
    
    next();
};
