var $ = require('jquery');
var _ = require('underscore');
var moment = require('moment');

exports.get = _.memoize( function(userId) {
    return $.ajax({
	url: "/users/" + userId,
	headers: {Accept: "application/json;charset=utf-8"},
    });
});

function me() {
    return exports.get('me');
};

exports.me = me;

$(document).ready(function() {
    me().then( function(user) {
	if (user.isGuest === false) {
	    $('#loginUser').show();

	    if (user.name.split(' ')[0])
		$('#userFirstName').text(user.name.split(' ')[0]);
	} else {
	    $('#loginGuest').show();		
	}

	// Instructors should see a "statistics" button
	if (user.instructorRepositoryPaths) {
	    $('#menu-supervise').show();
	    
	    user.instructorRepositoryPaths.forEach( function(p) {
		if (window.location.pathname.startsWith( p ))
		    $('#instructor-view-statistics').show();
		if (window.location.pathname.startsWith( '/' + p ))
		    $('#instructor-view-statistics').show();		    
	    });
	}

	// If there's git content loaded...
	var repositoryName = $('main').attr('data-repository-name');
	var xourse = $('main').attr('data-xourse-path');
	if (xourse && repositoryName) {
	    // and if we have 
	    if (user.bridges) {
		var assignment = undefined;
		user.bridges.forEach( function(bridge) {
		    if ((bridge.path == xourse) && (bridge.repository == repositoryName)) {
			assignment = bridge;
		    }
		});

		if (assignment) {
		    var dueDate = moment(Date.parse(assignment.dueDate));
		    if (dueDate.isValid()) {
			$('#dueDateCountdown').text( dueDate.fromNow() );
			$('#dueDate').attr('title', "Due at " + dueDate.format('LLLL') );
			$('#dueDate').show();		    
			$('#dueDate').tooltip();
			
			window.setInterval( function() {
			    $('#dueDateCountdown').text( dueDate.fromNow() );
			}, 1000);
		    }
		}
	    }
	}
    });
});
