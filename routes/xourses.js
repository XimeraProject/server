

exports.index = function(req, res, next) {
    var xourses = [];
    
    Object.keys(req.repositoryMetadata.xourses).forEach( function(xoursePath) {
	var x = req.repositoryMetadata.xourses[xoursePath];
	x.path = xoursePath;
	xourses.push( x );
    });
    
    res.render('xourses/index', {
	repositoryName: req.repositoryName,
	xourses: xourses
    } );    		
};    
