define(['jquery', 'underscore', 'tincan'], function($, _, TinCan) {
    function onPlayerStateChange(event) {
	if (event.data == YT.PlayerState.PLAYING) {
	    var url = event.target.getVideoUrl();
	    url = url.toString().replace( /feature=player_embedded&/, '' );
	    
	    var title = event.target.getVideoData().title;
	    
	    TinCan.experienceVideo( url, title );
	}
    }

    var videosToConstruct = [];    

    window.onYouTubeIframeAPIReady = _.once( function() {
        _.each(videosToConstruct, function(video) {
	    player.loadPlayer(container, videoId);
        });
    });    
    
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
		width: 640,
		height: 360,
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
		    'onStateChange': onPlayerStateChange
		}
	    });
	}
    };

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
    
    return player;
});
