define([], function() {
    var exports = {};
    var isDirty = false;

    window.onbeforeunload = function(event) {
	if (isDirty)
	    return 'You have unsaved changes!';
    }

    exports.markDirty = function() {
	isDirty = true;
    };

    exports.markClean = function() {
	isDirty = false;
    };

    return exports;
});
