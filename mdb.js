var Grid = require('gridfs-stream');
var mongoose = require('mongoose');
var fstream = require('fstream');
var fs = require("fs");
var winston = require("winston");

exports = module.exports;

var ObjectId = mongoose.Schema.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

mongoose.connect('mongodb://' + process.env.XIMERA_MONGO_URL + "/" +
                 process.env.XIMERA_MONGO_DATABASE);
var gfs = Grid(mongoose.connection.db, mongoose.mongo);

// Notice this is different from Schema.ObjectId; Schema.ObjectId if for passing
// models/schemas, Types.ObjectId is for generating ObjectIds.
exports.ObjectId = mongoose.Types.ObjectId;
exports.gfs = gfs;

// TODO: Add appropriate indexes.
exports.initialize = function initialize() {
    winston.info("Initializing Mongo");
    exports.GitRepo = mongoose.model("GitRepo",
                                     {
                                         // Key
                                         gitIdentifier: String,
                                         // Other
                                         file: ObjectId,
                                         currentActivities: [ObjectId]
                                     });
    exports.Activity = mongoose.model("Activity",
                                      {
                                          // Key
                                          repo: ObjectId,
                                          relativePath: String,
                                          baseFileHash: {type: String, index: true},
                                          // Other
                                          htmlFile: ObjectId,
                                          latexSource: String,
                                          description: String,
                                          title: String
                                      });

    exports.Course = mongoose.model('Course',
                                    {
                                        // Key
                                        repo: ObjectId,
                                        relativePath: String,
                                        // Other
                                        name: String,
					slug: {type: String, index: true},
                                        activityTree: Mixed
                                    });

    
    exports.GitRepo.find({}, function (err, repos) {
	if (repos.length == 0) {
	    var testRepo = new exports.GitRepo({
		gitIdentifier: "kisonecat/git-pull-test",
		file: mongoose.Types.ObjectId()
	    });
	    testRepo.save(function () {});
	}
    });
}

exports.copyLocalFileToGfs = function (path, fileId, callback) {
	var locals = {pipeErr: false};
	read = fs.createReadStream(path);
    write = gfs.createWriteStream({
        _id: fileId,
        mode: 'w'
    });
    write.on('error', function (err) {
        locals.pipeErr = true;
    });
    write.on('close', function (file) {
        if (locals.pipeErr) {
            callback("Unknown error saving archive.");
        }
        else {
            winston.info("GFS file written.")
            callback();
        }
    });
    read.pipe(write);
}
