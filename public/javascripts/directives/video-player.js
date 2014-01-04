/*
 * 
 * A "youtube" element packaged as an angular template.
 *
 */

var youtubeDeferred = new $.Deferred();
var youtubePromise = youtubeDeferred.promise();

// Don't actually do directive linking until the YouTube API has loaded
function onYouTubeIframeAPIReady() {
    youtubeDeferred.resolve();
}

gratisuApp.directive('youtube', ['$timeout', function($timeout) {
    return {
	restrict: 'E',	// this directive will only be used as an element

	scope: {
	    code:'@code', // the YouTube video id
	    seconds:'=seconds' // the current video position, in seconds
	},

	// there's a good reason to surround the YouTube by a div?
	template: ('<div class="youtube" style="height:390px;"><div class="replaced-by-youtube-player"></div></div>'),

	link: function(scope, element, attrs) {

	    // When the player is ready, cue the video at the requested position
	    var onPlayerReady = function(event) {
		var player = event.target;

		player.cueVideoById(scope.code, scope.seconds);

		scope.$watch( "seconds", function() {
		    /* This is probably a terrible solution.  The
		       problem is that below I update scope.seconds,
		       but I don't actually intend to seek.

		       On the other hand, I can only seekTo keyframes
		       ANYWAY, so maybe it is perfectly fine to avoid
		       seeking unless the request moves us far enough. */
		    if (player.getCurrentTime() - scope.seconds > 0.5)
			player.seekTo( scope.seconds, true );
		});
	    };

	    // Every second or so while the video plays, update scope.seconds with the current video position
	    var onPlayerStateChange = function(event) {
		var player = event.target;

		var everySecond = function() {
		    scope.seconds = player.getCurrentTime();
		    if (player.getPlayerState() == 1) $timeout( everySecond, 1000 );
		};

		// If YouTube is in the "playing" state
		if (player.getPlayerState() == 1) {
		    $timeout( everySecond, 1000 );
		}
	    };

	    // Once the YouTube API is loaded...
	    youtubePromise.done(function() {
		// replace the interior div...
		var iframe = element.children()[0];

		// with the YouTube Player
		var player = new YT.Player(iframe, {
		    height: '390',
		    width: '640',
		    playerVars: { 
			modestbranding: 1, // no YouTube logo in corner
			showinfo: 0,
			enablejsapi: 1,
		    },
		    events: {
			'onReady': onPlayerReady,
			'onStateChange': onPlayerStateChange
		    }});
	    });
	},
    };
}]);
