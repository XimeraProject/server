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
					 commit: String,
                                         lastUpdate: {type: Date, index: true},
                                     });

    // These records are designed to conform to the TinCan API 1.0.0
    exports.LearningRecord = mongoose.model("LearningRecord",
					    {
						actor: {type: ObjectId, ref:"User"},
						verbId: String,
						object: Mixed,
						result: Mixed,
						context: Mixed,
						timestamp: Date,
						stored: Date,
						authority: Mixed,
						version: String,
						attachments: Mixed
					    });    
    
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
				    }
				   );
    
    exports.Activity = mongoose.model("Activity",
                                      {
					  // deprecated
                                          latexSource: String,
                                          htmlFile: ObjectId,
                                          baseFileHash: {type: String, index: true},
					  relativePath: String,
                                          repo: {type: ObjectId, ref:"GitRepo"},

                                          // Unknown status
                                          description: String,
                                          recent: Boolean,
                                          slug: String,

					  // Currently used
                                          timeLastUsed: {type: Date, index: true},
					  commit: {type: String, index: true},
					  path: String,
					  hash: {type: String, index: true},
                                          title: String,
                                      });

    exports.User = mongoose.model("User",
                                  {
                                      googleOpenId: {type: String, index: true, unique: true, sparse: true},
                                      courseraOAuthId: {type: String, index: true, unique: true, sparse: true},
                                      twitterOAuthId: {type: String, index: true, unique: true, sparse: true},				      
                                      ltiId: {type: String, index: true, unique: true, sparse: true},
                                      githubId: {type: String, index: true, unique: true, sparse: true},
                                      githubAccessToken: {type: String},
				      course: String,
				      superuser: Boolean,
                                      name: String,
                                      email: String,
				      displayName: String,
				      website: String,
				      location: String,
				      birthday: Date,
				      biography: String,
				      xudos: Number,
				      xarma: Number,
				      userAgent: String,
				      remoteAddress: String,
                                      isGuest: Boolean,
                                      lastUrlVisited: String,
                                      isInstructor: Boolean
                                  });

    // Deprecated
    exports.Scope = mongoose.model("Scope",
                                   new mongoose.Schema({
                                       activity: ObjectId,
                                       user: ObjectId,
                                       dataByUuid: Mixed
                                   }, {
                                       minimize: false
                                   }));

    exports.State = mongoose.model("State",
                                   new mongoose.Schema({
                                       activityHash: String,
                                       user: ObjectId,
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


    // Activity completion is updated to most recent version; completion log is write-only.
    activityCompletionSchema = new mongoose.Schema({
        activitySlug: String,
        user: {type: ObjectId, index: true},
        activity: ObjectId, // Most recent version.
        percentDone: Number, // Percent complete of most recent version.
	numParts: Number,
	numComplete: Number,
        completeUuids: [String],
        complete: Boolean,
        completeTime: Date
    });
    exports.CompletionLog = mongoose.model("CompletionLog", activityCompletionSchema);
    activityCompletionSchema.index({activitySlug: 1, user: 1}, {unique: true});
    exports.ActivityCompletion = mongoose.model("ActivityCompletion", activityCompletionSchema);

    answerLogSchema = new mongoose.Schema({
        activity: ObjectId,
        user: ObjectId,
        questionPartUuid: String,
        value: String,
        correct: Boolean,
        timestamp: Date
    });
    answerLogSchema.index({activity: 1, user: 1});
    answerLogSchema.index({user: 1, timestamp: 1});
    exports.AnswerLog = mongoose.model("AnswerLog", answerLogSchema);

    var CourseSchema = new mongoose.Schema ({
        // Key
        repo: ObjectId,
        relativePath: String,
        // Other
        name: String,
        description: String,
	slug: {type: String, index: true},
        activityTree: Mixed
    });

    RegExp.escape= function(s) {
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    CourseSchema.methods.normalizeSlug = function normalizeActivitySlug(activitySlug) {
	var repo = this.slug.split('/').slice(0,2).join( '/' )
	var re = new RegExp("^" + RegExp.escape(repo) + '\\/');
	return activitySlug.replace( ":", '/' ).replace( re, '' );
    };

    CourseSchema.methods.activityURL = function activityURL(activity) {
	return "/course/" + this.slug + "/activity/" + this.normalizeSlug(activity.slug) + "/";
    };
    
    CourseSchema.methods.flattenedActivities = function flattenedActivities() {
	var queue = [];

	var f = function(nodes) {
	    for(var i = 0; i < nodes.length; i++) {
		queue.push( nodes[i] );
		f(nodes[i].children);
	    }
	};
	
	f(this.activityTree);

	return queue;
    };

    CourseSchema.methods.previousActivity = function previousActivities(activity) {
	var flattened = this.flattenedActivities();

	activity = _.find( flattened, function(x) { return x.slug === activity.slug } );
	if (activity === undefined)
	    return null;

	var i = _.indexOf( flattened, activity );

	if (i <= 0)
	    return null;

	return flattened[i-1];
    };

    CourseSchema.methods.nextActivity = function nextActivities(activity) {
	var flattened = this.flattenedActivities();

	activity = _.find( flattened, function(x) { return x.slug === activity.slug } );
	if (activity === undefined)
	    return null;

	var i = _.indexOf( flattened, activity );

	if (i + 1 < flattened.length)
	    return flattened[i+1];

	return null;
    };

    CourseSchema.methods.activityParent = function activityParent(activity) {
	var f = function(nodes) {
	    for(var i = 0; i < nodes.length; i++) {
		var result = f(nodes[i].children);
		if (result) return result;

		if (_.where( nodes[i].children, {slug: activity.slug} ).length > 0) {
		    return nodes[i];
		}
	    }

	    return null;
	};

	return f(this.activityTree);
    };

    CourseSchema.methods.activityChildren = function activityChildren(activity) {
	var flattened = this.flattenedActivities();

	activity = _.find( flattened, function(x) { return x.slug === activity.slug } );
	if (activity === undefined)
	    return [];

	return activity.children;
    };

    CourseSchema.methods.activitySiblings = function activitySiblings(activity) {
	var parent = this.activityParent(activity);

	if (parent)
	    return parent.children;

	return this.activityTree;
    };

    exports.Course = mongoose.model('Course', CourseSchema );

    mongoose.connect(url, {}, function (err) {
	callback(err);
    });
}
