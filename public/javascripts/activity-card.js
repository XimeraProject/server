define(['jquery', 'underscore'], function($, _) {

    var createActivityCard = function() {
	var activityCard = $(this);
    };

    $.fn.extend({
	activityCard: function() {
	    return this.each( createActivityCard );
	}
    });    
    
    return;
});
