var winston = require('winston');

exports.get = function(req, res) {
    req.db.scopes.findOne({activityId: req.params.activityId} , function(err, document) {
        if (document) {
            winston.info("ASF");
            winston.info(document.dataByUuid);
            res.json(document.dataByUuid);
        }
        else {
            // If there is nothing in the database, give the client an empty hash
            res.json({});
        }
    });
}

exports.put = function(req, res) {
    req.db.scopes.update({activityId: req.params.activityId}, {$set: {dataByUuid: req.body.dataByUuid}}, {upsert: true});
    res.json({ok: true});
}