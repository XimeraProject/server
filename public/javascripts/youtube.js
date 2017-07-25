var $ = require('jquery');
var _ = require('underscore');
var TinCan = require('./tincan');

// This is an attempt to implement https://registry.tincanapi.com/#profile/19/recipes

function videoObject( target ) {
    var videoData = target.getVideoData();
    var title = videoData.title;
    var id = videoData.video_id;
    var duration = target.getDuration();
        
    return {
        id: 'http://www.youtube.com/watch?v=' + id,
        definition: {
	    name: { "en-US": title },
	    type: "http://activitystrea.ms/schema/1.0/video",
	    extensions: {
		"http://id.tincanapi.com/extension/duration": duration
	    }
	}
    };
}

function videoVerb( target, container, verb, word )
{
    TinCan.recordStatement( {
	verb: {
            id: verb,
            display: {'en-US': word }
        },
	object: videoObject( target ),
	context: {
	    contextActivities: {
		parent: TinCan.activityHashToActivityObject( $(container).activityHash() )
	    }
	}
    });
}

function videoStarted( target, container, start ) {
    console.log("verb: started", start);
    TinCan.recordStatement({
        verb: {
            id: "http://activitystrea.ms/schema/1.0/play",
            display: {'en-US': "played"}
        },
        object: videoObject( target ),
	context: {
            extensions: {
		"http://id.tincanapi.com/extension/starting-point": start
            },
	    contextActivities: {
		parent: TinCan.activityHashToActivityObject( $(container).activityHash() )
	    }
        }
    });
}

function videoPaused( target, container, finish ) {
    console.log("verb: paused", finish);    
    TinCan.recordStatement({
        verb: {
            id: "http://id.tincanapi.com/verb/paused",
            display: {'en-US': "paused"}
        },
        object: videoObject( target ),
	context: {
            extensions: {
		"http://id.tincanapi.com/extension/ending-point": finish
            },
	    contextActivities: {
		parent: TinCan.activityHashToActivityObject( $(container).activityHash() )
	    }
        }
    });
}

function videoEnded( target, container ) {
    console.log("verb: ended");        
    videoVerb( target, container, "http://activitystrea.ms/schema/1.0/complete", "completed" );
}

function timeString(seconds) {
    function pad(n) {
	return (n < 10) ? ("0" + n.toString()) : n.toString();
    }
    
    return Math.floor( seconds / 60 ).toString() + ":" + pad(seconds % 60);
}


function videoSkipped(target, container, start, finish) {
    console.log("verb: skipped", start, finish);        
    TinCan.recordStatement({
        verb: {
            id: "http://id.tincanapi.com/verb/skipped",
            display: {'en-US': 'skipped'}
        },
        object: videoObject( target ),
	context: {
            extensions: {
		"http://id.tincanapi.com/extension/starting-point": start,
		"http://id.tincanapi.com/extension/ending-point": finish
            },
	    contextActivities: {
		parent: TinCan.activityHashToActivityObject( $(container).activityHash() )
	    }
        }
    });
}

function videoWatched(target, container, start, finish) {
    console.log("verb: watched", start, finish);
    TinCan.recordStatement({
        verb: {
            id: "http://activitystrea.ms/schema/1.0/watch",
            display: {'en-US': 'watched'}
        },
        object: videoObject( target ),
	context: {
            extensions: {
		"http://id.tincanapi.com/extension/starting-point": start,
		"http://id.tincanapi.com/extension/ending-point": finish
            },
	    contextActivities: {
		parent: TinCan.activityHashToActivityObject( $(container).activityHash() )
	    }	    
        }
    });
}

function onPlayerStateChange(event, container, videoId) {
    var container = $('#' + container);
    
    var lastPlayerState = container.data('lastPlayerState');

    // BADBAD: this is broken
    console.log("new state=",event.data);
    console.log( event );
    switch (event.data) {
    case (YT.PlayerState.PLAYING):
	container.data( 'lastPlayedTime', event.target.getCurrentTime() );
        videoStarted(event.target, container, event.target.getCurrentTime());
	
	
        break;
	
    case (YT.PlayerState.PAUSED):
	var timer = setTimeout(
	    function() {
		if (lastPlayerState == YT.PlayerState.PLAYING) {
		    videoWatched(event.target, container, container.data('lastPlayedTime'), event.target.getCurrentTime())
		}
		videoPaused(event.target, container, event.target.getCurrentTime());		
	    }, 250);

	container.data( 'lastPausedTime', event.target.getCurrentTime() );	
	container.data( 'timer', timer );
        break;

    case (YT.PlayerState.BUFFERING):
	clearTimeout( container.data( 'timer' ) );

	if (lastPlayerState != YT.PlayerState.UNSTARTED) {
	    videoWatched(event.target, container, container.data('lastPlayedTime'), container.data('currentTime') );
	    videoSkipped(event.target, container, container.data('currentTime'), event.target.getCurrentTime());
	}
	break;
	
    case (YT.PlayerState.ENDED):
	// BADBAD: I'm faking this as if it meant "completed" but it
	// doesn't necessarily mean the learner watched ALL the video
        videoWatched(event.target, container, container.data('lastPlayedTime'), event.target.getCurrentTime())	
        videoEnded(event.target, container);
        break;
	
    case (YT.PlayerState.UNSTARTED):
        break;
    }
    
    container.data( 'lastPlayerState', event.data );
}

function onPlayerReady(event, container, videoId) {
    var target = event.target;
    // Matt Thomas requests that videos defualt to something with a higher resolution
    target.setPlaybackQuality("hd720");

    container = $('#' + container);
    
    setInterval( function(){
	container.data( 'currentTime', target.getCurrentTime() );
    }, 250);
}


var videosToConstruct = [];    

var player = {
    playVideo: function(container, videoId) {
	if (typeof(YT) == 'undefined' || typeof(YT.Player) == 'undefined') {
	    videosToConstruct.push([container, videoId]);
	    
	    $.getScript('//www.youtube.com/iframe_api');
	} else {
	    player.loadPlayer(container, videoId);
	}
    },

    loadPlayer: function(container, videoId) {
	new YT.Player(container, {
	    videoId: videoId,
	    width: 720,
	    height: 405,
	    // For a list of all parameters, see:
	    // https://developers.google.com/youtube/player_parameters
	    playerVars: {
		autoplay: 0,
		controls: 1,
		modestbranding: 1,
		rel: 0,
		showinfo: 0
	    },
	    events: {
		'onReady': function( event ) { return onPlayerReady(event, container, videoId); },
		'onStateChange': function( event ) { return onPlayerStateChange(event, container, videoId); }
	    }
	});
    }
};

window.onYouTubeIframeAPIReady = _.once( function() {
    _.each(videosToConstruct, function(video) {
	player.loadPlayer(video[0], video[1]);
    });
});    

$(function() {
    $('.youtube-player').each( function() {
	var div = $(this);
	div.uniqueId();
	var id = div.attr('id');
	
	var url = div.attr('data-youtube');

	if (url.match( /watch\?v=/ )) {
	    url = url.replace( /.*watch\?v=/, '' );
	}

	player.playVideo( id, url );
    });
});

module.exports = player;
