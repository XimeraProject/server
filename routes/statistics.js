var fs        = require("fs");
var config = require('../config');
var path = require('path');

var lrsRoot = config.repositories.root;

// BADBAD: This is horribly slow.
exports.get = function(req, res, next) {
    console.log( req.params.repository );
    var filename = path.join( lrsRoot, req.params.repository + ".git", "summary.json" );
    var activityHash = req.params.activityHash;
    
    fs.readFile(filename, 'utf8', function (err, data) {
	if (err)
	    next(err);
	else {
	    var summary = JSON.parse(data);
	    res.json( summary.activities[activityHash] );
	}
    });
};
