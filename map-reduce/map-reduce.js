var mongo = new Mongo();
var db = mongo.getDB("test");

var mapResponse = function() {
    var url = this.object.id.split('/');
    var hash = url[4];
    var problem = url[6];
    var answer = url[8];

    var result = {};
    result[problem] = {};
    result[problem][answer] = {};

    var response = this.result.response;
    
    if (typeof response == 'string')
	response = response.replace(/\0/g, '' );

    if (Array.isArray(response)) {
	response.forEach( function(r) {
	    result[problem][answer][r] = 1;
	});
    } else {
	result[problem][answer][response] = 1;
    }
    
    emit(hash, result);
};

var mapSuccess = function() {
    var url = this.object.id.split('/');
    var hash = url[4];
    var problem = url[6];
    var answer = url[8];

    var result = {};
    result[problem] = {};
    result[problem][answer] = {};

    var success = this.result.success;
    
    result[problem][answer][success] = 1;
    
    emit(hash, result);
};


var reduce = function(key, values) {
    var result = {};

    values.forEach( function(v) {	
	
	Object.keys(v).forEach( function(problem) {
	    if (!(result[problem]))
		result[problem] = {};
	    
	    Object.keys(v[problem]).forEach( function(answer) {
		if (!(result[problem][answer]))
		    result[problem][answer] = {};
		
		Object.keys(v[problem][answer]).forEach( function(response) {
		    if (!(result[problem][answer][response]))
			result[problem][answer][response] = 0;

		    result[problem][answer][response] += v[problem][answer][response];
		});
	    });
	});
    });
    
    return result;
};

db.learningrecords.mapReduce( mapResponse, reduce,
			      { out: "answers",
				query: { verbId: "http://adlnet.gov/expapi/verbs/answered" }
			      });

db.learningrecords.mapReduce( mapSuccess, reduce,
			      { out: "successes",
				query: { verbId: "http://adlnet.gov/expapi/verbs/answered" }
			      });

// I suppose I might miss some -- oh well!
db.ServerEvent.insert( { event: "MapReduce", timestamp: new ISODate() } );

