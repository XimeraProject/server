/*
 * GET users listing.
 */
var mdb = require('../mdb');
    
exports.getXarma = function(req, res) {
    if (!req.user) {
	res.json(0);
	return;
    }

    if (req.user.xarma)
	res.json(req.user.xarma);
    else
	res.json(0);
    
    return;
}

exports.getXudos = function(req, res) {
    if (!req.user) {
	res.json(0);
	return;
    }

    if (req.user.xudos)
	res.json(req.user.xudos);
    else
	res.json(0);    

    return;
}

exports.postXudos = function(req, res) {
    //var points = req.params.points;

    if (!req.user) {
	res.json(0);
	return;
    }

    var points = req.body.points;

    mdb.User.update( req.user, {$inc: { xudos : points }}, {},
		     function( err, document ) {
			 console.log( document );
			 res.json(req.user.xudos + points);
		     });
}

exports.postXarma = function(req, res) {
    if (!req.user) {
	res.json(0);
	return;
    }

    var points = req.body.points;

    mdb.User.update( req.user, {$inc: { xarma : points }}, {},
		     function( err, document ) {
			 console.log( document );
			 res.json(req.user.xarma + points);
		     });
}
