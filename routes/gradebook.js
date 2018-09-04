var mdb = require('../mdb');
var request = require('request');
var pug = require('pug');
var path = require('path');
var config = require('../config');
var async = require('async');
const uuidv1 = require('uuid/v1');
var mongo = require('mongodb');

var redis = require('redis');

// create a new redis client and connect to our local redis instance
var client = redis.createClient();

// if an error occurs, print it to the console
client.on('error', function (err) {
    console.log("Error " + err);
});

var passback = pug.compileFile(path.join(__dirname,'../views/lti/passback.pug'));

// We now wait many minutes for grades to settle
var DEBOUNCE = 1000 * 60 * 3;

function processGradebook(id, callback) {
    mdb.LtiBridge.findOne( {_id: new mongo.ObjectID(id) }, function(err, bridge) {
	if (err) {
	    callback(err);
	    return;
	}
	
	var pox = passback({
	    messageIdentifier: uuidv1(),
	    resultDataUrl: config.root + '/users/' + bridge.user._id + '/' + bridge.repository + '/' + bridge.path,
	    resultScore: bridge.resultScore,
	    resultTotalScore: bridge.resultTotalScore,
	    sourcedId: bridge.lisResultSourcedid
	});

	var url = bridge.lisOutcomeServiceUrl;
					
	mdb.KeyAndSecret.findOne(
	    {ltiKey: bridge.oauthConsumerKey},
	    function(err, keyAndSecret) {
		if (err) {
		    callback(err);
		} else {
		    if (!keyAndSecret) {
			callback("Missing LTI secret.");
		    } else {
			var oauth = {
			    callback: "about:blank",
			    body_hash: true,			
			    consumer_key: keyAndSecret.ltiKey,
			    consumer_secret: keyAndSecret.ltiSecret,
			    signature_method: bridge.oauthSignatureMethod
			};
			
			request.post({
			    url: url,
			    body: pox,
			    oauth: oauth,
			    headers: {
				'Content-Type': 'application/xml',
			    }
			}, function(err, response, body) {
			    if (err) {
				callback(err);
			    } else {
				bridge.submittedScore = true;
				bridge.save(callback);
			    }
			});
		    }
		}
	    });
    });
}

function process() {
    client.zrangebyscore('gradebook', -Infinity, Date.now(), function(err, responses) {
	if (err) return;
	async.each( responses, function(response, callback) {
	    client.zrem( 'gradebook', response, function(err, count) {
		if ((!err) && (count == 1)) {
		    processGradebook(response, callback);
		} else {
		    callback(err);
		}
	    });
	});
    });
}
// Look if there is anything to process every few seconds
setInterval( process, 10000 );

exports.record = function(req, res, next) {
    var repositoryName = req.params.repository;

    if (!req.user) {
	next('No user logged in.');
    } else {
	mdb.LtiBridge.find( {user: req.user._id, repository: repositoryName, path:req.params.path }, function(err, bridges) {
	    if (err) {
		next(err);
	    } else {
		async.each( bridges,
			    function(bridge, callback) {
				// Silently ignore attempts to submit homework after the due date
				if (bridge.dueDate < Date.now()) {
				    callback(null);
				    return;
				}
				
				var pointsPossible = parseInt(bridge.pointsPossible);
				if (pointsPossible == 0) {
				    callback(null);
				    return;
				}

				// BADBAD: round to a couple decimal places to avoid some weird appearances on canvas
				var resultScore = Math.ceil(100 * parseFloat(req.body.pointsEarned) / parseFloat(req.body.pointsPossible)) / 100.0;
				var resultTotalScore = Math.ceil(100 * parseFloat(req.body.pointsEarned) / parseFloat(req.body.pointsPossible) * pointsPossible)/100.0;

				// No need to record zeros in the gradebook
				if (resultScore == 0) {
				    callback(null);
				    return;				    
				}

				var better = false;

				if (((!bridge.resultScore) || (bridge.resultScore < resultScore)) && (!isNaN(resultScore))) { 
				    bridge.resultScore = resultScore;
				    better = true;
				}
				if (((!bridge.resultTotalScore) || (bridge.resultTotalScore < resultTotalScore)) && (!isNaN(resultTotalScore))) {
				    bridge.resultTotalScore = resultTotalScore;
				    better = true;
				}

				if (better == false) {
				    callback(null);
				    return;
				}

				bridge.submittedScore = false;
				
				bridge.save(function(err) {
				    if (!err) {
					var debouncedTime = Date.now() + DEBOUNCE;
					if (debouncedTime > bridge.dueDate)
					    debouncedTime = bridge.dueDate;
					
					client.zadd('gradebook', debouncedTime, bridge._id.toString());
				    }
				    
				    callback(err);
				});
			    },
			    function(err) {
				if (err) 
				    res.status(500).json(err);			    
				else
				    res.json({ok: true});			    
			    });
	    }
	});
    }
};
