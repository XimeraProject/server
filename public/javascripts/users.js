var $ = require('jquery');
var _ = require('underscore');

exports.get = _.memoize( function(userId) {
    console.log("Requesting user credentials...");
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

	    me().then( function(user) { console.log(user.name); } );
	    me().then( function(user) { console.log(user.name); } );
	    me().then( function(user) { console.log(user.name); } );	    
	    
	    if (user.name.split(' ')[0])
		$('#userFirstName').text(user.name.split(' ')[0]);
	} else {
	    $('#loginGuest').show();		
	}
    });

    me().then( function(user) { console.log(user); } );
    me().then( function(user) { console.log(user.name); } );
    me().then( function(user) { console.log(user.name); } );	    
    
});
