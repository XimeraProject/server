var mdb = require('../mdb');
var winston = require('winston');
var snappy = require('snappy');
var path = require('path');
var async = require('async');
var fs        = require("fs");
var buffer24        = require("buffer24");
var uint32 = require('uint32');
var crc32 = require('fast-crc32c');

var lrsRoot = process.env.GIT_REPOSITORIES_ROOT;

var logFiles = {};
function logFile( name, callback ) {
    console.log("logFile = ",name);
    var filename = path.join( lrsRoot, name + ".git", "learning-record-store" );
    if (logFiles[filename]) {
	callback(null, logFiles[filename]);
    } else {
	// BADBAD: this SHOULD be O_DIRECT to ensure atomicity
	fs.open(filename, fs.constants.O_WRONLY | fs.constants.O_APPEND, function(err, fd) {
	    if (err) {
		// File doesn't exist, so create it
		fs.open(filename, fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_APPEND, function(err, fd) {
		    if (err) {
			callback(err);
		    } else {
			// And include the initial chunk that says sNaPpY
			var firstChunk =  Buffer.from([0xff,0x06,0x00,0x00,0x73,0x4e,0x61,0x50,0x70,0x59]);
			fs.write( fd, firstChunk, function(err) {
			    if (err) {
				callback(err);				
			    } else {		
				logFiles[filename] = fd;		
				callback(null, fd);
			    }
			});
		    }
		});
	    } else {
		logFiles[filename] = fd;
		callback(null, fd);
	    }
	});
    }
}

function recordStatement( repository, statement, callback ) {
    var stringified = JSON.stringify(statement);
    
    async.parallel([
	function(callback)  {
	    snappy.compress(stringified, callback);
	},
	function(callback)  {
	    logFile( repository, callback );
	},
    ], function(err, results) {
	if (err) {
	    console.log(err);
	    callback(err);
	} else {
	    // https://github.com/google/snappy/blob/master/framing_format.txt
	    // BADBAD
	    
	    var fd = results[1];
	    var buffer = results[0];
	    
	    var chunkType = Buffer.from([0x00]);
	    // three-byte little-endian length of the chunk in bytes
	    var length = Buffer.alloc(3);
	    length.writeUInt24LE(buffer.length + 4, 0);

	    var checksum = crc32.calculate(stringified, 0);
	    var maskedChecksum = uint32.addMod32( uint32.rotateRight(checksum, 15), 0xa282ead8 );
	    var checksumBuffer = Buffer.alloc(4);
	    checksumBuffer.writeUInt32LE(maskedChecksum, 0);
	    
	    fs.write( fd, Buffer.concat( [chunkType, length, checksumBuffer, buffer] ), callback );
	}
    });
}

function escapeKeys(obj) {
    if (!(Boolean(obj) && typeof obj == 'object'
      && Object.keys(obj).length > 0)) {
        return false;
    }
    Object.keys(obj).forEach(function(key) {
        if (typeof(obj[key]) == 'object') {
            escapeKeys(obj[key]);
        } else {
            if (key.indexOf('.') !== -1) {
                var newkey = key.replace(/\./g, '．');
                obj[newkey] = obj[key];
                delete obj[key];
            }
            if (key.indexOf('$') !== -1) {
                var newkey = key.replace(/\$/g, '＄');
                obj[newkey] = obj[key];
                delete obj[key];
            }

        }
    });
    return true;
}

exports.get = function(req, res) {
    var filename = path.join( lrsRoot, req.params.repository + ".git", "learning-record-store" );
    console.log(filename);
    var stream = fs.createReadStream(filename);
    fs.stat(filename, function(err, stat) {
	if (err) {
            res.status(500).send(err);	    
	} else {
	    res.sendSeekable(stream, {length: stat.size,
				      type: 'application/x-snappy-framed' });
	}
    });
};

exports.postStatements = function(req, res) {
    if (!req.user) {
        res.status(500).send("");
    } else {
	req.body.forEach( function(data) {
	    var statement = {};

	    statement.actor = req.user._id;

	    if ('verb' in data) {
		statement.verb = data.verb;
	    
		if ('id' in data.verb)
		    statement.verbId = data.verb.id;
	    }

	    if ('object' in data)
		statement.object = data.object;

	    if ('result' in data)
		statement.result = data.result;

	    statement.context = {};
	    if ('context' in data)
		statement.context = data.context;
	    
	    if ('timestamp' in data)	    	    
		statement.timestamp = data.timestamp;

	    statement.stored = new Date();

	    statement.authorty = {};
	    statement.version = "1.0.0";

	    statement.attachments = [];

	    // Mongo forbids dots and dollar signs in key names, so we
	    // replace them with full width unicode replacements But
	    // good news!  Our new backend doesn't have this
	    // restriction.
	    // 
	    // escapeKeys( statement );
	    
	    var repository = req.params.repository;
	    
	    recordStatement( repository, statement, function(err) {
		// I just ignore whether they are successful or not
	    });
	});
	res.status(200).json({ok: true});		    
    }
};
