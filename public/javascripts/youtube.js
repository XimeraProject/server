define(['jquery'], function($) {
  var player = {
    playVideo: function(container, videoId) {
      if (typeof(YT) == 'undefined' || typeof(YT.Player) == 'undefined') {
        window.onYouTubeIframeAPIReady = function() {
          player.loadPlayer(container, videoId);
        };

        $.getScript('//www.youtube.com/iframe_api');
      } else {
        player.loadPlayer(container, videoId);
      }
    },

    loadPlayer: function(container, options) {
      new YT.Player(container, options);
    }
  };

  return player;
});
