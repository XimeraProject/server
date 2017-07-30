var fs = require('fs');
var config = require('../config');
var path = require('path');
var learningRecordStore = require('./read-lrs.js');
var async = require('async');

function mergeResponseIntoAnswers( answers, entry ) {
    console.log(entry);
    if (!(answers.responses))
	answers.responses = {};
    
    if (entry.result) {
	var response = entry.result.response;
	if (response) {
	    answers.responses[response] = (answers.responses[response] || 0) + 1;
	}
    }
}

function mergeSuccessIntoAnswers( answers, entry ) {
    if (!(answers.successes))
	answers.successes = {};
    
    if (entry.result) {
	var success = entry.result.success;
	if ((success === true) || (success === false)) {
	    answers.successes[success] = (answers.successes[success] || 0) + 1;
	}
    }
}

function mergeEntryIntoSummary(summary, entry) {
    if (!(summary.activities))
	summary.activities = {};
    
    if ((entry.object) && (entry.object.objectType == 'Activity')) {
	var id = entry.object.id;
	if (id) {
	    var matches = id.match( /\/activities\/([^\/]+)\/problems\/([^\/]+)\/answers\/([^\/]+)/ );
	    if (matches) {
		var activityHash = matches[1];
		var problemId = matches[2];
		var answerId = matches[3];

		summary.activities[activityHash] = summary.activities[activityHash] || {};
		summary.activities[activityHash][problemId] = summary.activities[activityHash][problemId] || {};
		summary.activities[activityHash][problemId][answerId] = summary.activities[activityHash][problemId][answerId] || {};

		if ((entry.verb) && (entry.verb.id == 'http://adlnet.gov/expapi/verbs/answered')) {
		    var answer = summary.activities[activityHash][problemId][answerId];
		    mergeResponseIntoAnswers( answer, entry );
		    mergeSuccessIntoAnswers( answer, entry );
		}
	    }
	}
    }
    
    return;
}

console.log("Summarizing learning recors under " + config.repositories.root);

fs.readdir(config.repositories.root, function(err, items) {
    async.each( items,
		function(repositoryName, callback) {
		    var directory = path.join( config.repositories.root, repositoryName );
		    var lrsFilename = path.join( directory, 'learning-record-store' );
		    var summaryFilename = path.join( directory, 'summary.json' );

		    console.log("Working on " + repositoryName);
		    
		    async.waterfall([
			function(callback) {
			    console.log("...reading previous summary");
			    fs.readFile(summaryFilename, 'utf8', function (err, data) {
				if (err)
				    callback(null, {position: 0});
				else
				    callback(null, JSON.parse(data));
			    });
			},
			function(summary, callback) {
			    console.log("...processing new events");
			    learningRecordStore.read(
				lrsFilename, summary.position,
				function( entry, callback ) {
				    mergeEntryIntoSummary(summary, entry);
				    callback(null);
				},
				function(err, position) {
				    if (err) {
					if (err.code == 'ENOENT')
					    callback(null, summary);
					else 
					    callback(err);
				    } else {
					summary.position = position;
					callback(null, summary);
				    }
				});
			},
			function(summary, callback) {
			    console.log("...saving new summary");
			    fs.writeFile(summaryFilename, JSON.stringify(summary), callback );
			}
		    ], function (err) {
			callback(err);
		    });
		},
		function(err) {
		    if (err) {
			console.log(err);
		    } else {
			console.log("Finished with all summaries.");
		    }
		});
});
