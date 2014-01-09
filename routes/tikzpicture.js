var winston = require('winston');

exports.tikzpicture = function(req, res) {
    winston.info("Image hash", req.params.hash);
    req.db.tikzPngFiles.findOne({hash: parseInt(req.params.hash)}, function (err, document) {
        if (document) {
            res.set('Content-Type', 'image/png');
            res.send(document.content.value(true));
        }
        else {
            res.status(404);
            res.send("");
        }
    });
};