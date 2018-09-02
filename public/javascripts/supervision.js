var $ = require('jquery');
var _ = require('underscore');
var async = require('async');
var io = require('socket.io-client');

var socket;

function getUser( userId ) {
    var supervision = $('#supervision');
    var user = $('#user-' + userId, supervision);

    if (user.length == 0) {
	user = $('<li class="media supervised-user mb-4"></div>');
	user.attr('id', 'user-' + userId );
	
	var image = $('<img class="d-flex mr-3">');
	user.prepend(image);

	var body = $('<div class="media-body" style="overflow: hidden;"><h5 class="mt-0"><a href="/users/' + userId + '"><span class="supervised-name"></span></a> <small><a class="supervised-email"href="#"></a></small></h5><div class="supervised-completions"></div></div>');
	user.append(body);
	
	supervision.append(user);
    }

    return user;
}

function updateUser( userId, user ) {
    var element = getUser( userId );

    if (user.imageUrl) 
	$('img', element).attr('src', user.imageUrl );

    if (user.name) 
	$('h5 .supervised-name', element).text(user.name);

    if (user.email) {
	$('h5 .supervised-email', element).text(user.email);
	$('h5 .supervised-email', element).attr('href', 'mailto:' + user.email );
    }
}

function upvoteUser( userId ) {
    var supervision = $('#supervision');
    var user = getUser( userId );
	
    user.attr('data-reference', parseInt(user.attr('data-reference')) + 1 );
    supervision.prepend(user);

    // Move it to the top
    user.parent().prepend(user);
}

function downvoteUser(userId, repositoryName, activityPath) {
    var supervision = $('#supervision');
    var user = getUser( userId );    

    if (user.length > 0) {
	user.attr('data-reference', parseInt(user.attr('data-reference')) - 1 );
    }

    if (repositoryName && activityPath) {
	console.log("removing ", repositoryName, activityPath);
	var card = $("[data-repository='" + repositoryName + "'][data-path='" + activityPath + "']", user);
	card.remove();
    }
}

function completion( userId, repositoryName, activityPath, complete ) {
    var supervision = $('#supervision');
    var user = getUser( userId );
    
    var card = $("[data-repository='" + repositoryName + "'][data-path='" + activityPath + "']", user);

    if (card.length > 0) {
	console.log("updating");
	card.attr('data-complete', complete);
    } else {
	card = $('<div class="media supervised-activity"></div>');
	card.attr('data-repository', repositoryName);
	card.attr('data-path', activityPath);
	card.attr('data-complete', complete);

	var url = '/users/' + userId + '/' + repositoryName + '/' + activityPath;
	card.prepend($('<div class="media-body" style="overflow: hidden;"><h5 class="d-flex align-items-center"><div style="width: 48pt;" class="mr-2 progress h-100"><div class="progress-bar bg-success" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div></div><a style="text-overflow: ellipsis; overflow: hidden;" href="' + url + '">' + repositoryName + '/' + activityPath + '</a></h5></div>'));
	
	$('.supervised-completions', user).prepend(card);
    }

    var progress = $('.progress-bar', card);
    var percent = Math.round(complete*100);
    progress.attr('aria-valuenow', percent);
    progress.attr('aria-valuemax', 100);
    progress.css('width', percent.toString() + '%' );

    return;
}

function supervise() {
    // Build an appropriate URL based on the page URL
    var websocketUrl = "ws:";
    if (window.location.protocol === "https:") {
	websocketUrl = "wss:";
    }
    websocketUrl += "//" + window.location.host + "/ws";

    try {
	console.log( "Attempting websocket connection...");
	
	socket = new WebSocket(	websocketUrl );

	// It would be nicer to use ...parameters, and I can't just
	// use arguments because it's not actually an array
	socket.sendJSON = function() {
	    var parameters = [];
	    var i;
	    for( i=0; i<arguments.length; i++ )
		parameters[i] = arguments[i];
	    socket.send( JSON.stringify( parameters ) );
	};
    } catch (err) {
	alert( "Could not connect.  We are not supervising." );	
    }

    socket.sendJSON( 'supervise' );

    var handlers = {};
    
    handlers.enter = function(user) {
	upvoteUser(user._id);
	updateUser(user._id, user);
    };

    handlers.leave = function(payload) {
	var userId = payload.userId;
	var repositoryName = payload.repositoryName;
	var activityPath = payload.activityPath;

	downvoteUser(userId, repositoryName, activityPath);
    };

    handlers.completions = function(payload) {
	console.log(payload);	
	payload.forEach( function(c) {
	    completion( c.userId,
			c.repositoryName,
			c.activityPath,
			c.complete  );
	});
    };

    socket.addEventListener('message', function (event) {
	var payload = JSON.parse( event.data );

	if (! Array.isArray(payload)) {
	    console.log("WebSocket message is not an array.");
	    return;
	}

	if (payload.length == 0) {
	    console.log("WebSocket message is empty.");
	    return;
	}
	    
	var message = payload[0];
	var camelCased = message.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });

	if (handlers[camelCased]) {
	    handlers[camelCased].apply( socket, payload.slice(1) );
	} else {
	    console.log( "Do not know how to handle " + message );
	}
    });    
}

$(function() {
    var supervision = $('#supervision');

    if (supervision.length > 0) {
	supervise();
    }
});
