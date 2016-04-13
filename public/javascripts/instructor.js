var $ = require('jquery');
    
function announce( hash, kind, answers ) {
    var selector = function(hash, problem, answerable) {
	return "[data-activity='" + hash + "'] " + "#" + problem + " #" + answerable; 
    };
    
    Object.keys(answers).forEach( function(problem) {
	Object.keys(answers[problem]).forEach( function(answerable) {
	    var element = $(selector(hash, problem, answerable));
	    var statistics = answers[problem][answerable];

	    element.trigger( "ximera:statistics:" + kind, statistics );
	});
    });
}

$(function() {
    $("#instructor-view-statistics").click( function() {
	var commit = $(this).attr('data-commit');
	var hash = $(this).attr('data-activity');

	$.ajax({
	    url: '/statistics/' + commit + '/' + hash + '/answers',
	    type: 'GET',
	    success: function(result) {
		if (result)
		    announce( hash, 'answers', result );
	    }
	});

	$.ajax({
	    url: '/statistics/' + commit + '/' + hash + '/successes',
	    type: 'GET',
	    success: function(result) {
		if (result)
		    announce( hash, 'successes', result );			
	    }
	});	    
    });
});
    
    
