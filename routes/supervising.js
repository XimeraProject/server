var mdb = require('../mdb');
var mongo = require('mongodb');


exports.watch = function( req, res, next ) {
    res.render('watch', { user: req.user } );
}

exports.isInstructorForLearnerInRepository = function( repositoryName, supposedInstructor, supposedLearner, callback ) {
    mdb.LtiBridge.find({user: supposedInstructor._id}, function(err, instructorBridges) {
	if (err) {
	    callback(err, false);
	    return;
	}
	
	mdb.LtiBridge.find({user: supposedLearner._id}, function(err, learnerBridges) {
	    if (err) {
		callback(err, false);
		return;
	    }

	    callback( null, instructorBridges.some( function(instructorBridge) {
		// The instructor is actually an instructor of some sort...
		return instructorBridge.roles.some( function(role) {
		    return role.match( /Instructor/ ) || role.match( /Administrator/ ) || role.match( /TeachingAssistant/ ) || role.match( /Grader/ );
		}) &&
		    // and the learner is actually in that course
		    learnerBridges.some( function(learnerBridge) {
			return (instructorBridge.toolConsumerInstanceGuid == learnerBridge.toolConsumerInstanceGuid) &&
			    (instructorBridge.contextId == learnerBridge.contextId) &&
			    (instructorBridge.repository == learnerBridge.repository) &&
			    (instructorBridge.repository == repositoryName);			    
		    });
	    }));
	});
    });
};

// Used when we want to view page as another learner
exports.masquerade = function(req,res,next) {
    mdb.User.findOne({_id: new mongo.ObjectID(req.params.masqueradingUserId)},
		     function(err, learner) {
			 if (err) {
			     next(err);
			     return;
			 }

			 if (!learner) {
			     next('Could not find user with id ' + req.params.masqueradingUserId);
			     return;
			 }

			 exports.isInstructorForLearnerInRepository( req.params.repository, req.user, learner,
								     function(err, good) {
									 if (err) {
									     next(err);
									 } else {
									     if (!good)
										 // Should be a different HTTP error code
										 next('You do not have permission to see the work of that learner.');
									     else {
										 req.learner = learner;
										 next();
									     }
									 }
								     });
		     });
};


