var $ = require('jquery');
var _ = require('underscore');
var async = require('async');
var io = require('socket.io-client');

var socket;

function upvoteUser( userId ) {
    var supervision = $('main#supervision');
    var user = $('#user-' + userId, supervision);
    
    if (user.length > 0) {
	user.attr('data-reference', parseInt(user.attr('data-reference')) + 1 );
    } else {
	user = $("<div id='user-" + userId + "' data-reference='1'></div>");
	supervision.prepend(user);
    }	

    user.text(userId);

    // Move it to the top
    user.parent().prepend(user);
}

function downvoteUser(userId) {
    var supervision = $('main#supervision');
    var user = $('#user-' + userId, supervision);

    if (user.length > 0) {
	user.attr('data-reference', parseInt(user.attr('data-reference')) - 1 );

	if (parseInt(user.attr('data-reference')) <= 0)
	    user.remove();
    }
}

function completion( userId, repositoryName, activityPath, complete ) {
    var supervision = $('main#supervision');
    var user = $('#user-' + userId, supervision);

    var card = $("[data-repository='" + repositoryName + "'][data-path='" + activityPath + "']", user);

    if (card.length > 0) {
	card.attr('data-complete', complete);
    } else {
	card = $("<div data-repository='" + repositoryName + "' data-path='" + activityPath + "'></div>");
	user.prepend(card);
	card.attr('data-complete', complete);	
    }

    card.text(complete);    
}

function supervise() {
    try {
	socket = io.connect();
    } catch (err) {
	alert( "Could not connect.  We are not supervising." );
    }

    socket.emit( 'supervise' );

    socket.on('enter', function(userId) {
	console.log(userId);
	
	upvoteUser(userId);
    });

    socket.on('leave', function(userId) {
	downvoteUser(userId);	
    });

    socket.on('completions', function(payload) {
	payload.forEach( function(c) {
	    completion( c.userId,
			c.repositoryName,
			c.activityPath,
			c.complete  );
	});
    });        
}

$(function() {
    var supervision = $('main#supervision');

    if (supervision.length > 0) {
	supervise();
    }
});
