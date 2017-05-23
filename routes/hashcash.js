var url = require('url');
var crypto = require('crypto');

var REQUIRED_COST = 20;

function verify( resource, hashcash ) {
    if (resource != hashcash.split(":")[3])
	return 0;
    
    var shasum = crypto.createHash('sha1');
    shasum.update(hashcash);
    var buffer = new Buffer(shasum.digest('hex'),"hex");

    var bits = 0;
    for (const b of buffer) {
	if (b == 0) bits += 8;
	if (b != 0) {
	    if (b & 0x80) return bits;
	    if (b & 0x40) return bits + 1;
	    if (b & 0x20) return bits + 2;
	    if (b & 0x10) return bits + 3;
	    if (b & 0x08) return bits + 4;
	    if (b & 0x04) return bits + 5;
	    if (b & 0x02) return bits + 6;
	    if (b & 0x01) return bits + 7;
	}
    }

    return bits;
}

exports.hashcash = function(req,res,next) {
    if (req.get('X-Hashcash')) {
	var hashcash = req.get('X-Hashcash');
	console.log( "hashcash = " + hashcash );
	var pathname = url.parse(req.url).pathname.substr(1);
	if (verify( pathname, hashcash ) < REQUIRED_COST)
	    res.status(400).send("Not enough hashcash attached.");
	else
	    next();
    } else {
	res.status(400).send("No hashcash attached.");
	return;
    }
}
