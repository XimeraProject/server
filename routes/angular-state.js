var winston = require('winston');

// TODO: Unloggedin users get "guest account" for session.
exports.get = function(req, res) {
    if (!req.user) {
        res.status(500).send('');
    }
    else {
        req.db.scopes.findOne({activityId: req.params.activityId, userId: req.user._id} , function(err, document) {
            if (document) {
                res.json(document.dataByUuid);
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
        req.db.scopes.update({activityId: req.params.activityId, userId: req.user._id}, {$set: {dataByUuid: req.body.dataByUuid}}, {upsert: true});
        res.json({ok: true});        
    }
}