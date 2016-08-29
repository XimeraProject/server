var $ = require('jquery');
var _ = require('underscore');
var database = require('./database');

// The trailing slash is necsesary here
var ximeraUrl = "https://ximera.osu.edu/";

////////////////////////////////////////////////////////////////
// Common verbs from ADL
var verb = function(word) {
    return {
	id: "http://adlnet.gov/expapi/verbs/" + word,
	display: {
	    "en-US": word
	}
    };
};

var verbExperienced = verb("experienced");
var verbAttempted = verb("attempted");
var verbAnswered = verb("answered");
var verbCompleted = verb("completed");

exports.verbExperienced = verb("experienced");
exports.verbAttempted = verb("attempted");
exports.verbAnswered = verb("answered");
exports.verbCompleted = verb("completed");

exports.activityHashToActivityObject = function(activityHash) {
    var result = {
	objectType: "Activity",
	id: ximeraUrl + "activities/" + activityHash,
    };

    // If we are actually talking about the current activity...
    if (activityHash == $("#theActivity").attr( 'data-activity' )) {
	// Then we can grab a bit more information
	var title = $("#theActivity").attr( 'data-title' );    
    
	result.definition = {
	    name: { "en-US": title },
	    moreInfo: window.location.href
	};
    }

    return result;
};

////////////////////////////////////////////////////////////////
// Shortcuts for recording certain kinds of experience
exports.experienceProblemById = function(activityHash, problemId) {
    exports.recordStatement( {
	verb: verbExperienced,
	object: {
	    objectType: "Activity",
	    id: ximeraUrl + "activities/" + activityHash + "/problems/" + problemId
	    // BADBAD: should include a definition
	},
	context: {
	    contextActivities: {
		parent: exports.activityHashToActivityObject( activityHash )
	    }
	}
    });	
};    

exports.experienceActivityByHash = function(activityHash) {
    exports.recordVerbObject(
	verbExperienced,
	exports.activityHashToActivityObject( activityHash ) );
};

exports.experienceActivity = function(element) {
    return exports.experienceActivityByHash( $(element).activityHash() );
};

exports.experienceProblem = function(element) {
    return exports.experienceProblemById( $(element).activityHash(), $(element).attr('id') );
};

var problemUrl = function(element) {
    var activityHash = $(element).activityHash();
    var problemId = $(element).attr('id');

    var url = ximeraUrl + "activities/" + activityHash + "/problems/" + problemId;

    return url;
};    

var answerUrl = function(element) {
    var activityHash = $(element).activityHash();
    var problemId = $(element).parents( ".problem-environment" ).first().attr( 'id' );
    var answerId = $(element).attr('id');
    
    var url = ximeraUrl + "activities/" + activityHash + "/problems/" + problemId + "/answers/" + answerId;

    return url;
};

exports.answer = function(element, result) {
    exports.recordVerbObject( verbAnswered, {
	objectType: "Activity",
	id: answerUrl(element)
    },{
	result: result
    });
};

exports.completeProblem = function(element) {
    exports.recordStatement( {
	verb: verbCompleted,
	object: {
	    objectType: "Activity",
	    id: problemUrl(element) },
	context: {
	    contextActivities: {
		parent: exports.activityHashToActivityObject( $(element).activityHash )
	    }
	}
    });
};

exports.experience = function(element) {
    if ($(element).hasClass('activity'))
	exports.experienceActivity(element);
    else if ($(element).hasClass('problem-environment'))
	exports.experienceProblem(element);
    else
	throw "I do not know how to 'experience' this DOM element.";
};

////////////////////////////////////////////////////////////////
// Commands to serialize a learning record to our learning record store

var queue = [];

var uploadQueue = _.throttle( function() {
    $.ajax({
	url: '/xAPI/statements',
	type: 'POST',
	data: JSON.stringify(queue),
	contentType: 'application/json',
    });

    // We don't bother with errors or success -- if we fail to hear reports from students, that's fine!
    queue = [];
}, 500 );

// statement should include a verb and an object; the current user is implied
exports.recordStatement = function(statement) {
    statement.timestamp = (new Date()).toISOString();

    queue.push( statement );
    
    uploadQueue();
};

exports.recordVerbObject = function( verb, object, others ) {
    var statement = { verb: verb, object: object };
    
    if (others)
	_.extend( statement, others );
    
    return exports.recordStatement( statement );
};    
