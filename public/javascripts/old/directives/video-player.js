/*
 * 
 * A "youtube" element packaged as an angular template.
 *
 */


define(['angular', 'jquery', 'underscore', 'youtube'], function(angular, $, _, YT) {
    'use strict';

    angular.module('ximeraApp.videoPlayer', [])
	.directive('ximeraYoutube', ['$timeout', 'stateService', function($timeout, stateService) {
	    return {
		restrict: 'A',
		scope: {
		    arg1: '@'
		},
		// there's a good reason to surround the YouTube by a div?
		template: ('<div class="youtube" style="height:390px;"><div class="replaced-by-youtube-player"></div></div>'),
		transclude: true,

		link: function($scope, element, attrs, controller, transclude) {
		    var code;

                    stateService.bindState($scope, $(element).attr('data-uuid'), function () {
			$scope.db.seconds = 0;
                    });

                    // Extract YouTube code from original
                    transclude(function (clone) {
			code = $scope.arg1.replace( /.*=/, '' );
                    });

		    // When the player is ready, cue the video at the requested position
		    var onPlayerReady = function(event) {
			var player = event.target;
			player.cueVideoById(code, $scope.db.seconds);
			
			$scope.$watch( "db.seconds", function() {
			    /* This is probably a terrible solution.  The
			       problem is that below I update $scope.seconds,
			       but I don't actually intend to seek.
			       
			       On the other hand, I can only seekTo keyframes
			       ANYWAY, so maybe it is perfectly fine to avoid
			       seeking unless the request moves us far enough. */
			    if (player.getCurrentTime() - $scope.db.seconds > 0.5)
				player.seekTo( $scope.db.seconds, true );
			});
		    };
		    
		    // Every second or so while the video plays, update scope.seconds with the current video position
		    var onPlayerStateChange = function(event) {
			var player = event.target;
			
			var everySecond = function() {
			    $scope.db.seconds = player.getCurrentTime();
			    if (player.getPlayerState() == 1) $timeout( everySecond, 1000 );
			};
			
			// If YouTube is in the "playing" state
			if (player.getPlayerState() == 1) {
			    $timeout( everySecond, 1000 );
			}
		    };

		    // replace the interior div...
		    var iframe = element.children()[0];
			
		    // with the YouTube Player
		    var player = YT.loadPlayer(iframe, {
			height: '390',
			width: '640',
			playerVars: { 
			    modestbranding: 1, // no YouTube logo in corner
			    showinfo: 0,
			    enablejsapi: 1,
			    wmode: 'transparent' // so it respects z-index
			},
			events: {
			    'onReady': onPlayerReady,
			    'onStateChange': onPlayerStateChange
			}});
		},
	    };
	}]);
});
