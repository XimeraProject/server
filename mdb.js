// TODO: Unify this with the DB code in app.js

var Grid = require('gridfs-stream');
var mongoose = require('mongoose');
var fstream = require('fstream');
var fs = require("fs");
var winston = require("winston");

exports = module.exports;

var ObjectId = mongoose.Schema.ObjectId;

mongoose.connect('mongodb://' + process.env.XIMERA_MONGO_URL + "/" + process.env.XIMERA_MONGO_DATABASE);
var gfs = Grid(mongoose.connection.db, mongoose.mongo);

// Notice this is different from Schema.ObjectId; Schema.ObjectId if for passing models/schemas, Types.ObjectId is for generating ObjectIds.
exports.ObjectId = mongoose.Types.ObjectId;
exports.gfs = gfs;

exports.initialize = function initialize() {
    winston.info("Initializing Mongo");
    exports.GitRepo = mongoose.model("GitRepo", { url: String, fileId: ObjectId, currentActivityIds: [ObjectId] });
    exports.Activity = mongoose.model("Activity",
                                      { htmlFileId: ObjectId,
                                        baseFileHash: {type: String, index: true},
                                        repoId: {type: ObjectId, ref: 'GitRepo'},
                                        gitRelativePath: String,
                                        latexSource: String,
                                        description: String,
                                        title: String });
}
