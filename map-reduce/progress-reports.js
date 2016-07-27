var mongo = new Mongo();
var db = mongo.getDB("test");

// mdb.Completion.update({activityHash: req.params.activityHash, user: req.user._id}, {$set: {complete: req.body.complete, date: new Date()}}, {upsert: true}, function (err, affected, raw) {

db.gradebooks.drop();

db.completions.aggregate( [
    { $match : {
	activityHash: { $exists: true }
    }},
    { $lookup : {
	from: "users",
	localField: "user",
	foreignField: "_id",
	as: "user",
    }},
    { $match : {
	"user.isGuest": false,
    }},    
    { "$project" : {
	"user.email": 1,
	"user.name": 1,
	"user._id": 1,
	"complete": 1,
	"activityHash": 1,	
    }},    
    { $lookup : {
	from: "activities",
	localField: "activityHash",
	foreignField: "hash",
	as: "activity",
    }},
    { $unwind : {
	path: "$activity",
    }},
    { $lookup : {
	from: "branches",
	localField: "activity.commit",
	foreignField: "commit",
	as: "branch",
    }},
    { $unwind : {
	path: "$branch",
    }},    
    { "$project" : {
	complete: 1,
	user: 1,
	path: "$activity.path",
	"title": "$activity.title",	
	course: { $concat: [ "$branch.owner", "/", "$branch.repository" ] },
	commit: "$activity.commit"
    }},
    { "$group": {
        "_id": {
            "path": "$path",
            "course": "$course",
	    user: "$user",
        },
	"commits": { "$addToSet" : "$commit" },	
	"title": { "$first" : "$title" },
        "complete": { "$max": "$complete" }
    }},
    { "$group": {
        "_id" : {
	    "course": "$_id.course",
	    user: "$_id.user",
	},
	"paths": { "$push": { "complete": "$complete",
			      "path": "$_id.path" } },
	"commits": { "$first" : "$commits" },		
    }},
    { "$group": {
        "_id" : "$_id.course",
	"users": { "$push": { "paths": "$paths",
			      "user": "$_id.user.email" } },
	"commits": { "$first" : "$commits" },
    }},    
    { $out : "gradebooks" }
] );
