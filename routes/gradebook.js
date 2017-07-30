var mdb = require('../mdb');
var gitBackend = require('./git');
var request = require('request');
var pug = require('pug');
var path = require('path');
var config = require('../config');
var async = require('async');
const uuidv1 = require('uuid/v1');

var passback = pug.compileFile(path.join(__dirname,'../views/lti/passback.pug'));

exports.record = function(req, res, next) {
    var repositoryName = gitBackend.normalizeRepositoryName(req.params.repository);

    if (!req.user) {
	next('No user logged in.');
    } else {
	mdb.LtiBridge.find( {user: req.user._id, repository: repositoryName, path:req.params.path }, function(err, bridges) {
	    if (err) {
		next(err);
	    } else {
		async.each( bridges,
			    function(bridge, callback) {
				var pointsPossible = parseInt(bridge.data.custom_canvas_assignment_points_possible);
				var resultScore = parseFloat(req.body.pointsEarned) / parseFloat(req.body.pointsPossible);
				var resultTotalScore = resultScore * pointsPossible;

				// BADBAD: should round these two a couple decimal places to avoid some weird appearances on canvas

				// BADBAD: should only send updates to canvas if the grade is going up
				
				var pox = passback({
				    messageIdentifier: uuidv1(),
				    resultDataUrl: config.root + '/users/' + req.user._id + '/' + repositoryName + '/' + req.params.path,
				    resultScore: resultScore,
				    resultTotalScore: resultTotalScore,
				    sourcedId: bridge.data.lis_result_sourcedid
				});
				
				var url = bridge.data.lis_outcome_service_url;
				
				var oauth = {
				    callback: "about:blank",
				    body_hash: true,			
				    consumer_key: bridge.data.oauth_consumer_key,
				    consumer_secret: config.lti.secret,
				    signature_method: bridge.data.oauth_signature_method
				};
				
				if (oauth.consumer_key != config.lti.key) {
				    console.log("WRONG KEY");
				}
				
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
					callback(null);
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
