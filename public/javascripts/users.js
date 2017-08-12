var $ = require('jquery');
var _ = require('underscore');

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

	if (user.instructorRepositoryPaths) {
	    user.instructorRepositoryPaths.forEach( function(p) {
		if (window.location.pathname.startsWith( p ))
		    $('#instructor-view-statistics').show();
		if (window.location.pathname.startsWith( '/' + p ))
		    $('#instructor-view-statistics').show();		    
	    });
	}
    });
    
});
