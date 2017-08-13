var Grid = require('gridfs-stream');
var mongoose = require('mongoose');
var fstream = require('fstream');
var config = require('./config');
var fs = require("fs");
var winston = require("winston");
var _ = require("underscore");

exports = module.exports;

var ObjectId = mongoose.Schema.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var url = 'mongodb://' + config.mongodb.url + "/" + config.mongodb.database;

exports.mongoose = mongoose;

// Notice this is different from Schema.ObjectId; Schema.ObjectId if for passing
// models/schemas, Types.ObjectId is for generating ObjectIds.
exports.ObjectId = mongoose.Types.ObjectId;

// TODO: Add appropriate indexes.
exports.initialize = function initialize(callback) {
    winston.info("Initializing Mongo");

    var UserSchema = new mongoose.Schema(
                                  {
                                      googleOpenId: {type: String, index: true, unique: true, sparse: true},
                                      courseraOAuthId: {type: String, index: true, unique: true, sparse: true},
                                      twitterOAuthId: {type: String, index: true, unique: true, sparse: true},				      
                                      ltiId: {type: String, index: true, unique: true, sparse: true},
                                      githubId: {type: String, index: true, unique: true, sparse: true},
                                      githubAccessToken: {type: String},
				      replacedBy: {type: ObjectId, ref:"User"},
				      course: String,
				      superuser: Boolean,
				      username: String,
				      password: String,				      
                                      name: String,
                                      email: String,
				      displayName: String,
				      website: String,
				      location: String,
				      birthday: Date,
				      biography: String,
				      xudos: Number,
				      xarma: Number,
				      imageUrl: String,
				      profileViews: Number,
				      userAgent: String,
				      visibility: String,
				      remoteAddress: String,
                                      isGuest: Boolean,
                                      isAuthor: Boolean, // BADBAD: this is just for fun -- it's not used anywhere
				      instructorRepositoryPaths: [String],				      
                                      lastUrlVisited: String,
				      lastSeen: Date,
				      instructor: Mixed,
                                      apiKey: {type: String, index: true, unique: true, sparse: true},				      
                                      apiSecret: String				      
                                  });
    UserSchema.index( { lastSeen: -1 } );
    
    exports.User = mongoose.model("User", UserSchema);

    exports.LtiBridge = mongoose.model("LtiBridge",
                                       new mongoose.Schema({
					   ltiId: {type: String, index: true},
					   
					   toolConsumerInstanceGuid: {type: String, index: true},
					   toolConsumerInstanceName: String,
					   
					   contextId: {type: String, index: true},
					   contextLabel: String,
					   contextTitle: String,
					   
					   resourceLinkId: String,
                                           dueDate: Date,
                                           untilDate: Date,
					   pointsPossible: Number,
					   
					   oauthConsumerKey: String,
					   oauthSignatureMethod: String,
					   lisResultSourcedid: String,
					   lisOutcomeServiceUrl: String,

					   instructionalStaff: Boolean,
					   
					   repository: {type: String, index: true},
					   path: {type: String, index: true},					   
					   
					   user: {type: ObjectId, index: true, ref:"User"},
					   roles: [String]
                                       }, {
					   minimize: false
                                       }));
        
    exports.State = mongoose.model("State",
                                   new mongoose.Schema({
                                       activityHash: {type: String, index: true},
                                       user: {type: ObjectId, index: true, ref:"User"},
                                       data: Mixed
                                   }, {
                                       minimize: false
                                   }));    
    
    exports.Completion = mongoose.model("Completion",
					new mongoose.Schema({
					    // The new method for storing completions
					    activityPath: {type: String, index: true},
					    repositoryName: {type: String, index: true},

					    // The old method for storing completions
					    activityHash: {type: String, index: true},
					    
					    user: {type: ObjectId, index: true, ref:"User"},
					    complete: Number,
                                            date: Date
					}, {
					    minimize: false
					}));

    exports.Label = mongoose.model("Label",
					new mongoose.Schema({
					    activityHash: {type: String, index: true},
					    commit: {type: String, index: true},					    
					    label: {type: String, index: true},
					}, {
					    minimize: false
					}));

    exports.AccessToken = mongoose.model("AccessToken",
				       new mongoose.Schema({
					   keyid: {type: String, index: true},
					   token: {type: String, index: true}
				       }));

    exports.KeyAndSecret = mongoose.model("KeyAndSecret",
					  new mongoose.Schema({
					      keyid: {type: String, index: true},
					      ltiKey: {type: String, index: true},
					      ltiSecret: String,
					      encryptedSecret: String
					  }));

    
    //mongoose.set('debug', true);    
    
    mongoose.connect(url, {}, function (err) {
	callback(err);
    });
};

