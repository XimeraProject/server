var mdb = require('../mdb'),
    remember = require('../remember'),
    async = require('async'),
    _ = require('underscore'),    
    path = require('path'),
    dirname = require('path').dirname,
    normalize = require('path').normalize,    
    extname = require('path').extname,
    pathJoin = require('path').join,
    winston = require('winston');
var crypto = require("crypto");
var path = require("path");
var fs = require("fs");
var zlib = require("zlib");
var querystring = require('querystring');
var url = require('url');

var absolutePathToKey = path.resolve("private_key.pem");
var privateKey = fs.readFileSync(absolutePathToKey, "utf8");

function renderError( res, err ) {
    res.status(500).render('fail', { title: "Internal Error", message: err });
}

function certificateToCode(certificate, callback) {
    var p = JSON.stringify(certificate);
    
    zlib.deflateRaw(p, {level: zlib.Z_BEST_COMPRESSION}, (err, buffer) => {
	if (err) {
	    callback(err);
	} else {
	    var data = new Buffer(buffer);
	    var encrypted = crypto.privateEncrypt(privateKey, data);
	    callback(null, encrypted.toString('base64'));
	}
    });
}

function codeToCertificate(code, callback) {
    var buffer = new Buffer(code, 'base64');
    var decrypted = crypto.publicDecrypt(privateKey, buffer);
    
    zlib.inflateRaw(decrypted, (err, buffer) => {
	if (err) {
	    callback(err);
	} else {
	    var result = {};
	    try {
		result = JSON.parse(buffer.toString("utf8"));
	    } catch (e) {
	    }
	    
	    callback( null, result );
	}
    });    
}

exports.xourse = function(req, res) {
    remember(req);

    var user = req.user;
    var xourse = req.xourse;
    
    xourse.locator = req.locator;

    var activityHashes = _.uniq( _.flatten( _.values(xourse.activities).map( function(activity) { return activity.hashes; } ) ) );
    
    mdb.Completion.find({user: req.user._id, activityHash: { $in: activityHashes }}).exec(
	function( err, completions ) {
	    if (err) {
		renderError( res, err );
	    } else {
		var activityCount = 0;
		var completionTotal = 0;
		
		xourse.activityList.forEach( function(activityPath) {
		    var url = pathJoin( xourse.locator,
					dirname( xourse.path ),
					activityPath
				      );

		    if (xourse.activities === undefined)
			xourse.activities = {};
		    
		    if (xourse.activities[activityPath] === undefined) {
			xourse.activities[activityPath] = {};
			xourse.activities[activityPath].title = url;
		    }
		    
		    xourse.activities[activityPath].url = '/course/' + normalize(url);

		    xourse.activities[activityPath].completion = 
			_.max( _.filter( completions,
					 function(c) { return _.contains( xourse.activities[activityPath].hashes, c.activityHash ); } )
			       .map(
				   function(c) { return c.complete; } ) );

		    if (xourse.activities[activityPath].completion < 0)
			xourse.activities[activityPath].completion = 0.0;
		    
		    if (!(activityPath.match(/^#/))) {
			activityCount++;
			completionTotal += xourse.activities[activityPath].completion;
		    }
		});

		var score = Math.round(10000*completionTotal / activityCount)/100;
		
		var certificate = {
		    name: req.user.name,
		    email: req.user.email,
		    user: "ximera.osu.edu/users/" + req.user._id,
		    date: new Date(),
		    course: xourse.locator,
		    score: score
		};

		certificateToCode( certificate, function(err, code) {
		    if (err) {
			res.render('certificate/xourse', { xourse: xourse,
							   certificate: certificate,
							   score: score
							 });		    
		    } else {
			var escaped = querystring.escape(code);
			
			res.render('certificate/xourse', { xourse: xourse,
							   certificate: certificate,
							   score: score,
							   escapedCode: escaped
							 });
		    }
		});
	    }
	});
};

exports.view = function(req, res) {
    var code = querystring.unescape( req.params.certificate );

    codeToCertificate( code, function(err, certificate) {
	if (err) {
	    renderError( res, err );	    
	} else {
	    var escaped = querystring.escape(code);	    
	    res.render('certificate/view', {escapedCode: escaped,
					    certificate: certificate});
	}
    });
    

}
