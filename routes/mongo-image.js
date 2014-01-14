var winston = require('winston');

exports.get = function(req, res) {
    winston.info("Image hash", req.params.hash);
    req.db.imageFiles.findOne({hash: parseInt(req.params.hash)}, function (err, document) {
        if (document) {
            res.set('Content-Type', document.mimetype);
            res.send(document.content.value(true));
        }
        else {
            res.status(404);
            res.send("");
        }
    });
};
