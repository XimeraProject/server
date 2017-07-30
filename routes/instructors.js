

exports.index = function(req, res, next) {
    var activity = req.activity;
    
    if (activity.kind != 'xourse') {
	next('Only xourses have instructors.');
	return;
    }
    
    var xourse = activity;
    xourse.path = req.activity.entry.path();
    if (xourse.path) {
	xourse.path = xourse.path.replace(/\.html$/,'')
    }		
    xourse.hash = req.activity.blob.id().toString();

    res.render('instructors', {
	xourse: xourse,
	repositoryName: req.repositoryName	
    } );    		
};    
