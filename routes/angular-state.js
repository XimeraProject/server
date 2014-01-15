var winston = require('winston')
  , mdb = require('../mdb');

exports.get = function(req, res) {
    if (!req.user) {
        res.status(500).send('');
    }
    else {
        mdb.Scope.findOne({activity: new mdb.ObjectId(req.params.activityId), user: req.user._id} , function(err, document) {
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
        mdb.Scope.update({activity: new mdb.ObjectId(req.params.activityId), user: req.user._id}, {$set: {dataByUuid: req.body.dataByUuid}}, {upsert: true}, function (err) {
            res.json({ok: true});
        });
    }
}
