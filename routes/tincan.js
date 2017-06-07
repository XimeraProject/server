var mdb = require('../mdb');
var winston = require('winston');
var snappy = require('snappy');
var path = require('path');
var async = require('async');
var fs        = require("fs");

var lrsRoot = process.env.GIT_REPOSITORIES_ROOT;

var logFiles = {};
function logFile( name, callback ) {
    console.log("logFile = ",name);
    var filename = path.join( lrsRoot, name + ".git", "learning-record-store" );
    if (logFiles[filename]) {
	callback(null, logFiles[filename]);
    } else {
	// BADBAD: this SHOULD be O_DIRECT to ensure atomicity
	fs.open(filename, fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_APPEND, function(err, fd) {
	    if (err) {
		callback(err);
	    } else {
		logFiles[filename] = fd;
		callback(null, fd);
	    }
	});
    }
}

function recordStatement( repository, statement, callback ) {
    async.parallel([
	function(callback)  {
	    snappy.compress(JSON.stringify(statement), callback);
	},
	function(callback)  {
	    logFile( repository, callback );
	},
    ], function(err, results) {
	if (err) {
	    console.log(err);
	    callback(err);
	} else {
	    var fd = results[1];
	    var buffer = results[0];
	    var length = Buffer.alloc(4);
	    length.writeUInt32LE(buffer.length, 0);
	    fs.write( fd, Buffer.concat( [length, buffer] ), callback );
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
