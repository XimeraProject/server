var mongo = require('mongodb');
var mdb = require('../mdb');
var winston = require("winston");
var path = require('path');
var url = require('url');
var gpg = require('gpg');
var async = require("async");
var crypto = require('crypto');
var base64url = require('base64url');

exports.authorization = function(req,res,next) {
    if (req.get('Authorization')) {
	var authorization = req.get('Authorization');
	var token = authorization.split(' ').reverse()[0];
	mdb.AccessToken.findOne({token: token}, function(err, pair) {
	    if (err)
		res.status(500).send('GPG Authorization is invalid.');
	    else {
		req.keyid = pair.keyid;
		next();
	    }
	});
    } else {
	res.status(500).send('GPG Authorization is missing.');
    }
};

exports.ltiSecret = function(req,res) {
    var keyid = req.params.keyid.replace(/[^0-9A-Fa-f]/g, "");

    gpg.call( "", ['--with-colons', '--fingerprint', keyid], function(err, result) {
	if (err) {
	    res.status(400).send( 'Could not find key.' );
	} else {
	    result = result.toString();
	    var fingerprints = result.split("\n").
		filter( function(line) { return (line.split(":")[0] == "fpr"); } ).
		map( function(line) { return line.split(":").slice(-2, -1)[0]; } );

	    if (! (fingerprints.includes( keyid ))) {
		res.status(400).send( 'Submitted fingerprint is incorrect.' );
	    } else {
		var ltiKey = req.params.ltiKey;
		mdb.KeyAndSecret.findOne( {ltiKey: ltiKey}, function(err, keyAndSecret) {
		    if (err)
			res.status(400).send( err );
		    else {
			if ((keyAndSecret) && (keyAndSecret.keyid != keyid)) {
			    res.status(400).send( 'That LTI key is already used by a different GPG key.' );
			    return;
			}

			if (keyAndSecret) {
			    res.status(200).send( keyAndSecret.encryptedSecret );
			    return;
			}
			
			crypto.randomBytes(32, function(err, buffer) {
			    var hash = {};
			    hash.keyid = keyid;
			    hash.ltiKey = ltiKey;
			    hash.ltiSecret = base64url(buffer);

			    gpg.encrypt( hash.ltiSecret, ['-a', '--always-trust', '--recipient', keyid ], function(err, result, errors) {
				if (err) {
				    res.status(400).send( 'Could not encrypt secret.' );
				} else {
				    hash.encryptedSecret = result;
				    keyAndSecret = new mdb.KeyAndSecret(hash);
				    keyAndSecret.save(function (err) {
					if (err)
					    res.status(400).send( err );
					else
					    res.status(200).send( keyAndSecret.encryptedSecret );					    
				    });				    
				}
			    });
			});
		    }
		});
	    }
	}
    });
};

// take a fingerprint of a key we have and produce a challenge
exports.token = function(req,res) {
    var keyid = req.params.keyid.replace(/[^0-9A-Fa-f]/g, "");

    gpg.call( "", ['--with-colons', '--fingerprint', keyid], function(err, result) {
	if (err) {
	    res.status(400).send( 'Could not find key.' );
	} else {
	    result = result.toString();
	    var fingerprints = result.split("\n").
		filter( function(line) { return (line.split(":")[0] == "fpr"); } ).
		map( function(line) { return line.split(":").slice(-2, -1)[0]; } );

	    if (! (fingerprints.includes( keyid ))) {
		res.status(400).send( 'Submitted fingerprint is incorrect.' );
	    } else {
		// 48 bytes is prettier for base64 because it avoids the trailing equal sign
		crypto.randomBytes(48, function(err, buffer) {
		    var token = base64url(buffer);
		    // BADBAD: Once we disable "always trust" then only people with keys we trust can actually log in; eventually that'll be a reasonable model
		    gpg.encrypt( token, ['--always-trust', '--recipient', keyid ], function(err, result, errors) {
			if (err) {
			    // The actual error is in err.toString() but revealing
			    // this seems like a bad policy
			    res.status(400).send( 'Could not produce token.' );
			} else {
			    // Save token
			    mdb.AccessToken.update(
				{keyid: keyid},
				{keyid: keyid, token: token},
				{upsert: true},
				function(err) {
				    if (err) {
					res.status(400).send( 'Could not save token.' );
				    } else {
					res.status(200).send( result );
				    }
				});
			}
		    });
		});
	    }
	}
    });
};

exports.add = function(req, res) {
    if(req.body.keytext == null)
	return res.send(404, "Missing keytext parameter.");

    if(!Array.isArray(req.body.keytext))
	req.body.keytext = [ req.body.keytext ];
    
    async.forEachSeries(req.body.keytext, function(keytext, next) {
	console.log( "import: " + keytext );
	gpg.importKey(keytext, function(err) {
	    if(err)
		return next(err);
	    
	    return next();
	});
    }, function(err) {
	if(err) {
	    return res.status(400).send("Error uploading key.");
	} else {
	    return res.status(200).send("Good");
	}
    });
};

