define(["jquery", "socketio"],function($, io) {

    // public domain code to handle relative date display
    $.getRelativeTime = function(diff) {
	var v = Math.floor(diff / 86400); diff -= v * 86400;
	if (v > 0) return (v == 1 ? 'Yesterday' : v + ' days ago');
	v = Math.floor(diff / 3600); diff -= v * 3600;
	if (v > 0) return v + ' hour' + (v > 1 ? 's' : '') + ' ago';
	v = Math.floor(diff / 60); diff -= v * 60;
	if (v > 0) return v + ' minute' + (v > 1 ? 's' : '') + ' ago';
	return 'Just now';
    };

    $.fn.toRelativeTime = function() {
	var t = $(this), x = Math.round(Date.parse(t.text()) / 1000);
	if (x) t.text($.getRelativeTime(Math.round(
	    new Date().getTime() / 1000) - x));
    };
    
    $.toRelativeTime = function(s) { $(s).each(function() { 
	$(this).toRelativeTime(); 
    }); };

    // swap out a button for a text editor
    var reply = function(room, button, parent) {
	var roomName = room.attr('id');

	var form = $('<form class="compose">' +
		     '<textarea class="content" id="wmd-input' + parent.toString() + '" name="content"/>' + 
		     '<button class="btn">Post</button></form>');
        
	form.submit( function() {
	    var document = { 'content': $('textarea.content', form).val() };

	    if (parent) {
		document.parent = parent;
	    }

	    $.post('/chat/' + roomName,
		   document,
		   function(data) {
		       if (!data) {
			   $(button).replaceWith( form );
		       }
		   }
		  )
		.fail(function() { $(button).replaceWith( form ); });

	    $(form).replaceWith( button );

	    return false;
	});

	/*
	editor.hooks.chain("onPreviewRefresh", function () {
	    MathJax.Hub.Queue(
		["Typeset",MathJax.Hub, $('.wmd-preview', form).get(0)]
    	    );
	});
	*/

	$(button).replaceWith( form );
    };

    // Add the given post hash to the room div
    var addPost = function( room, post ) {
	// convert post hash into DOM elements
	var postDiv = $('<div class="post"/>');
	postDiv.attr('id', post._id );

	var date = $('<div class="date"/>');
	date.text( (new Date(post.date)).toLocaleString() );
	date.toRelativeTime();

	var byline = $('<div class="byline"/>');
	byline.text( post.user.name );

	if ('_id' in post.user) {
	    byline.html( '<a href="/users/' + post.user._id + '">' + post.user.name + '</a>' );
	}

	if ('gravatar' in post.user) {
	    var gravatarUrl = 'https://secure.gravatar.com/avatar/' + post.user.gravatar + '.jpg?d=retro';
	    var gravatar = $('<img src="' + gravatarUrl + '"/>');
	    byline.prepend( gravatar );
	}

	var content = $('<div class="content"/>');
	if (post.content) {
	    //content.html( converter.makeHtml( post.content ) );
	    content.html( post.content );
	    MathJax.Hub.Queue(
		["Typeset",MathJax.Hub, content.get(0)]
    	    );
	}

	var replyButton = $('<button class="reply btn-sm btn">Reply</button>');
	replyButton.click( function() { reply(room, replyButton, post._id); } );
	postDiv.append( date, byline, content, $('<div class="replies"/>'), replyButton );

	// insert the post into the appropriate replies div
	var postParent = room.children('.posts');
	if ('parent' in post) {
	    postParent = $('#' + post.parent, room).children('.replies');
	}
	postParent.append( postDiv );

	// update room timestamp if needed
	if (room.prop('timestamp') <= parseInt(post.date)) {
	    room.prop( 'timestamp', parseInt(post.date) );
	}
    }

    // Make REST call to insert new posts into the room div
    var updateRoom = function( room ) {
	var name = room.attr('id');
	var timestamp = room.prop('timestamp');
	var url = '/rooms/' + name + '/' + timestamp;

	$.getJSON(url, function(data) {
	    $.each( data, function(postIndex) {
		addPost( room, this );
	    });
	});
    }

    // Walk through all rooms; set them to auto update
    $( ".chat" ).each(function( roomIndex ) {
	var room = $(this);

	room.prop('timestamp', 0);
	room.append( $('<div class="posts"/>') );

	var socket = io.connect('http://localhost:3000/');
	socket.emit( 'join room', $(this).attr('id') );

	var replyButton = $('<button class="reply btn-sm btn">Comment</button>');
	replyButton.click( function() { reply(room, replyButton, false); } );
	room.append( replyButton );

	socket.on('post', function (data) {
	    addPost( room, data );
	});

    });


    return;

    /*
    $(function() {

	var messages = [];
	var socket = io.connect('http://localhost:3000/');
	var field = document.getElementById("field");
	var sendButton = document.getElementById("send");
	var content = document.getElementById("content");
 
	socket.on('message', function (data) {
            if(data.message) {
		messages.push(data.message);
		var html = '';
		for(var i=0; i<messages.length; i++) {
                    html += messages[i] + '<br />';
		}
		content.innerHTML = html;
            } else {
		console.log("There is a problem:", data);
            }
	});
	
	sendButton.onclick = function() {
            var text = field.value;
            socket.emit('send', { message: text });
	};
	
    });
    */
});
