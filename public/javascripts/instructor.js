var $ = require('jquery');
    
function announce( hash, answers ) {
    var selector = function(hash, problem, answerable) {
	return "[data-hash='" + hash + "'] " + "#" + problem + " #" + answerable; 
    };
    
    Object.keys(answers).forEach( function(problem) {
	Object.keys(answers[problem]).forEach( function(answerable) {
	    var element = $(selector(hash, problem, answerable));
	    var statistics = answers[problem][answerable];

	    element.trigger( "ximera:statistics:answers", statistics.responses );
	    element.trigger( "ximera:statistics:successes", statistics.successes );	    
	});
    });
}

$(function() {
    $("#instructor-view-statistics").click( function() {
	$("#instructor-view-statistics").hide();
	
	var url = $(this).attr('data-activity-url');
	var hash = $(this).attr('data-activity-hash');
	
	$.ajax({
	    url: '/statistics/' + url + '/' + hash,
	    type: 'GET',
	    success: function(result) {
		if (result)
		    announce( hash, result );
	    }
	});
    });
});
    
    
