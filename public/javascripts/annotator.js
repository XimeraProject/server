var annotator = require('annotator');

var activityHash = function () {
    return {
        beforeAnnotationCreated: function (ann) {
	    // get the actual activity hash
            ann.activityHash = window.location.href;
        }
    };
};

function addAnnotator() {
    var app = new annotator.App();
    app.include(annotator.ui.main, {element: this})
	.include(annotator.storage.http,
		 {prefix: 'http://example.com/api'})
        .include(activityHash);
    app.start()
	.then(function () {
	    app.annotations.load({activityHash: window.location.href});
	});
}

$.fn.extend({
    annotator: function() {
	return this.each( addAnnotator );
    }
});
