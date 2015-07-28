module.exports = function(io) {
    var exports = {};
    
    var winston = require('winston')
    , mdb = require('../mdb')
    , util = require('util');
    
    exports.get = function(req, res) {
	if (!req.user) {
            res.status(500).send('');
	}
	else {
            mdb.State.findOne({activityHash: req.params.activityHash, user: req.user._id} , function(err, document) {
		if (document) {
		    // If the document isn't any good, just send an empty hash {}
		    if (document.data)
			res.json(document.data);
		    else
			res.json({});
		}
		else {
                    // If there is nothing in the database, give the client an empty hash
                    res.json({});
		}
            });
	}
    }
    
    exports.put = function(req, res) {
	if (!req.user) {
            res.status(500).send("");
	}
	else {
            mdb.State.update({activityHash: req.params.activityHash, user: req.user._id}, {$set: {data: req.body}}, {upsert: true}, function (err, affected, raw) {
		res.json({ok: true});
            });
	}
    }
    
    exports.remove = function(req, res) {
	if (!req.user) {
            res.status(500).send("");
	}
	else {
            mdb.State.update({activityHash: req.params.activityHash, user: req.user._id}, {$set: {data: {}}}, {upsert: true}, function (err, affected, raw) {
		res.json({ok: true});
            });
	}
    }


    return exports;
};
