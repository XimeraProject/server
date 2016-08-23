var Grid = require('gridfs-stream');
var mongoose = require('mongoose');
var fstream = require('fstream');
var fs = require("fs");
var winston = require("winston");
var _ = require("underscore");

exports = module.exports;

var ObjectId = mongoose.Schema.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var url = 'mongodb://' + process.env.XIMERA_MONGO_URL + "/" +
                 process.env.XIMERA_MONGO_DATABASE;

exports.mongoose = mongoose;

// Notice this is different from Schema.ObjectId; Schema.ObjectId if for passing
// models/schemas, Types.ObjectId is for generating ObjectIds.
exports.ObjectId = mongoose.Types.ObjectId;

// TODO: Add appropriate indexes.
exports.initialize = function initialize(callback) {
    winston.info("Initializing Mongo");

    var GitPushesSchema = new mongoose.Schema(
	{
	    gitIdentifier: String,
	    senderAccessToken: {type: String},
	    sender: Mixed,
	    repository: Mixed,
	    ref: String,
	    headCommit: Mixed,
	    finishedProcessing: Boolean
	}, 
	{
	    capped: 1024*1024,
	});
    exports.GitPushes = mongoose.model("GitPushes", GitPushesSchema);
    
    exports.GitRepo = mongoose.model("GitRepo",
                                     {
                                         // Key
                                         gitIdentifier: String,
                                         // Other
                                         file: ObjectId,
                                         needsUpdate: Boolean,
                                         feedback: String,
                                         currentActivities: [ObjectId]
                                     });

    exports.Branch = mongoose.model("Branch",
                                     {
                                         owner: {type: String, index: true},
					 repository: {type: String, index: true},
					 name: {type: String, index: true},
					 commit: {type: String, index: true},
                                         lastUpdate: {type: Date, index: true},
                                     });

    exports.Commit = mongoose.model("Commit",
                                    {
                                        owner: {type: String, index: true},
					repository: {type: String, index: true},
					sha: {type: String, index: true},
                                        author: Mixed,
                                        url: String,
                                        committer: Mixed,
                                        message: String,
                                        tree: Mixed,
                                        parents: Mixed,					 			
                                    });
    
    // These records are designed to conform to the TinCan API 1.0.0
    exports.LearningRecord = mongoose.model("LearningRecord",
					    {
						actor: {type: ObjectId, ref:"User"},
						verbId: String,
						verb: Mixed,
						object: Mixed,
						result: Mixed,
						context: Mixed,
						timestamp: Date,
						stored: Date,
						authority: Mixed,
						version: String,
						attachments: Mixed
					    });

    // A log of events
    var ServerEventSchema = new mongoose.Schema(
	{
	    description: String,
	    event: { type: String, index: true },
	    timestamp: { type: Date, index: true },
	}, 
	{
	    capped: 1024*1024,
	});
    exports.ServerEvent = mongoose.model("ServerEvent", ServerEventSchema);
    
    // 128 megabytes of compile logs
    var CompileLogSchema = new mongoose.Schema(
	{
	    hash: {type: String, index: true},
	    commit: {type: String, index: true},
	    errorList: Mixed,
	    log: String
	},
	{
	    capped: 1024*1024*128,
	});
    
    exports.CompileLog = mongoose.model("CompileLog", CompileLogSchema);    

    exports.GitFile = mongoose.model("GitFile",
                                      {
					  hash: {type: String, index: true},
					  commit: {type: String, index: true},
                                          path: {type: String, index: true},
                                      });

    exports.Blob = mongoose.model("Blob",
                                  {
				      hash: {type: String, index: true, unique: true, sparse: true},
				      data: Buffer
				  });

    exports.Xourse = mongoose.model("Xourse",
				    {
                                        timeLastUsed: {type: Date, index: true},
					commit: {type: String, index: true},
					path: String,
					hash: {type: String, index: true},
                                        title: String,
                                        activityList: Mixed,
                                        activities: Mixed,
				    }
				   );
    
    exports.Outcome = mongoose.model("Outcome",
				     {
					 name: {type: String, index: true},
					 activityHash: {type: String, index: true},
				     }
				    );
    
    exports.Activity = mongoose.model("Activity",
                                      {
					  // This should be "abstract"?
                                          description: String,
					  
					  // Currently used
                                          timeLastUsed: {type: Date, index: true},
					  commit: {type: String, index: true},
					  path: {type: String, index: true},
					  hash: {type: String, index: true},
                                          title: String,
                                          outcomes: Mixed,
                                      });

    exports.Answers = mongoose.model("Answers",
				     {
					 _id: {type: String, index: true},
					 value: Mixed
				    });

    exports.Successes = mongoose.model("Successes",
				     {
					 _id: {type: String, index: true},
					 value: Mixed
				    });

    var UserSchema = new mongoose.Schema(
                                  {
                                      googleOpenId: {type: String, index: true, unique: true, sparse: true},
                                      courseraOAuthId: {type: String, index: true, unique: true, sparse: true},
                                      twitterOAuthId: {type: String, index: true, unique: true, sparse: true},				      
                                      ltiId: {type: String, index: true, unique: true, sparse: true},
                                      githubId: {type: String, index: true, unique: true, sparse: true},
                                      githubAccessToken: {type: String},
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
				      profileViews: Number,
				      userAgent: String,
				      visibility: String,
				      remoteAddress: String,
                                      isGuest: Boolean,
                                      isAuthor: Boolean, // BADBAD: this is what permits a user to use xake publish
                                      lastUrlVisited: String,
				      lastSeen: Date,
				      instructor: Mixed,
                                      apiKey: {type: String, index: true, unique: true, sparse: true},				      
                                      apiSecret: String				      
                                  });
    UserSchema.index( { lastSeen: -1 } );
    
    exports.User = mongoose.model("User", UserSchema);

    exports.State = mongoose.model("State",
                                   new mongoose.Schema({
                                       activityHash: {type: String, index: true},
                                       user: {type: ObjectId, index: true},
                                       data: Mixed
                                   }, {
                                       minimize: false
                                   }));    
    
    exports.Post = mongoose.model("Post",
                                   new mongoose.Schema({
                                       room: {type: String, index: true},
				       content: String,
				       user: Mixed,
				       date: {type: Date, index: true},
				       parent: ObjectId,
				       upvoters: Mixed,
				       upvotes: Number,
				       flaggers: Mixed,
				       flags: Number,
				   }, {
                                       minimize: false
                                   }));

    exports.Completion = mongoose.model("Completion",
					new mongoose.Schema({
					    activityHash: {type: String, index: true},
					    user: {type: ObjectId, index: true},
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

    exports.Gradebook = mongoose.model("Gradebook",
				       new mongoose.Schema({
					   _id: {type: String, index: true},
					   users: Mixed,
					   commits: Mixed,
				       }));
							    
    RegExp.escape= function(s) {
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    //mongoose.set('debug', true);    

    mongoose.connect(url, {}, function (err) {
	callback(err);
    });
}
