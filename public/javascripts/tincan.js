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

var xAPIverb = function(word) {
    return {
	id: "http://activitystrea.ms/schema/1.0/" + word,
	display: {
	    "en-US": word
	}
    };
};

var verbExperienced = verb("experienced");
var verbAttempted = verb("attempted");
var verbAnswered = verb("answered");
var verbCompleted = verb("completed");
var verbSubmitted = xAPIverb("submit");

exports.verbExperienced = verb("experienced");
exports.verbAttempted = verb("attempted");
exports.verbAnswered = verb("answered");
exports.verbCompleted = verb("completed");
exports.verbSubmitted = xAPIverb("submit");

exports.activityHashToActivityObject = function(activityHash) {
    var result = {
	objectType: "Activity",
	id: ximeraUrl + "activities/" + activityHash,
    };

    // If we are actually talking about the current activity...
    if (activityHash == $("#theActivity").attr( 'data-hash' )) {
	// Then we can grab a bit more information
	var title = $("#theActivity").attr( 'data-title' );    

	result.definition = {
	    name: { "en-US": title },
	    moreInfo: window.location.href
	};

	// And use a better URL?  Maybe not.
	/*
	result.id = ximeraUrl +
	    $(this).repositoryName() + "/" +
	    $(this).activityPath() + "?" +
	    activityHash;
	*/
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

var freeResponseUrl = function(element) {
    var activityHash = $(element).activityHash();
    var answerId = $(element).attr('id');
    
    var url = ximeraUrl + "activities/" + activityHash + "/freeResponse/" + answerId;

    return url;
};

exports.submitted = function(element, response) {
    exports.recordVerbObject( verbSubmitted, {
	objectType: "Activity",
	id: freeResponseUrl(element)
    },{
	result: { response: response }
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
    var repositoryName = $("#theActivity").attr( 'data-repository-name' );
    
    if (repositoryName === undefined)
	repositoryName = '';

    var data = JSON.stringify(queue);
    queue = [];
    
    $.ajax({
	url: "/" + repositoryName + '/xAPI/statements',
	type: 'POST',
	data: data,
	contentType: 'application/json',
	error: function( xhr, textStatus, errorThrown ) {
	    // If we fail, put our payload back into the queue...
	    JSON.parse(data).forEach( function(statement) {
		queue.push( statement );
	    });
	    // and try again later
	    window.setTimeout(uploadQueue, 7001);
	}
    });
}, 1009 );

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

    console.log( statement );
    
    return exports.recordStatement( statement );
};    
