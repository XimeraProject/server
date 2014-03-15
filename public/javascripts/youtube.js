define(['jquery', 'underscore'], function($, _) {
    var videosToConstruct = [];

    // TODO: Ensure this is only called once?
    window.onYouTubeIframeAPIReady = function() {
        _.each(videosToConstruct, function(video) {
            new YT.Player(video[0], video[1]);
        });
    };

    var player = {
        loadPlayer: function(container, options) {
            if (typeof(YT) == 'undefined' || typeof(YT.Player) == 'undefined') {
                videosToConstruct.push([container, options]);
            }
            else {
                new YT.Player(container, options);
            }
        }
    };

    return player;
});
