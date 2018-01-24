var mdb = require('../mdb');
var request = require('request');
var pug = require('pug');
var path = require('path');
var config = require('../config');
var async = require('async');
const uuidv1 = require('uuid/v1');

var redis = require('redis');

// create a new redis client and connect to our local redis instance
var client = redis.createClient();

// if an error occurs, print it to the console
client.on('error', function (err) {
    console.log("Error " + err);
});

var passback = pug.compileFile(path.join(__dirname,'../views/lti/passback.pug'));

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
				
				var cacheKey = "gradebook:" + req.user._id + ":" + repositoryName + ":" + req.params.path;
				client.get(cacheKey, function(err, cachedGrade) {
				    if (parseFloat(cachedGrade) >= resultTotalScore) {
					callback(null);
				    } else {
					var pox = passback({
					    messageIdentifier: uuidv1(),
					    resultDataUrl: config.root + '/users/' + req.user._id + '/' + repositoryName + '/' + req.params.path,
					    resultScore: resultScore,
					    resultTotalScore: resultTotalScore,
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
								client.setex(cacheKey, 60*60, JSON.stringify(resultTotalScore));
								callback(null);
							    }
							});
						    }
						}
					    });
				    }
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
