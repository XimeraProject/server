var mdb = require('../mdb');
var winston = require('winston');

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
    }
    else {
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
	    // replace them with full width unicode replacements
	    escapeKeys( statement );
	    
	    mdb.LearningRecord.create( statement, function(err) {
		/*
		if (err) {
		    res.status(500).json({ok: false, err: err});
		    console.log(err);
		} else {
		}*/
		
		//console.log( JSON.stringify( statement, null, 4 ) );
		return;
	    });
	});
	// BADBAD: this needs to happen ONCE 
	res.status(200).json({ok: true});
    }    
};
