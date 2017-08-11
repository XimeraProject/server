var $ = require('jquery');
var _ = require('underscore');
var gradebook = require('./gradebook');
var database = require('./database');

var users = require('./users');

var displayProgress = function( card, progress ) {
    var progressBar = $('.progress-bar', card);
    progressBar.css('width', Math.round(progress * 100).toString() + '%' );
    progressBar.toggleClass('progress-bar-striped', progress > 0.9999);
};

var createActivityCard = function() {
    var activityCard = $(this);
    var href = activityCard.attr('data-path');

    // This is the new method for storing completion data
    var repositoryName = activityCard.attr('data-repository-name');
    var activityPath = activityCard.attr('data-path');

    if (repositoryName) {
	database.onCompletion( repositoryName, activityPath, function(c) {
	    displayProgress( activityCard, c );
	    activityCard.attr('data-max-completion', c );
	    gradebook.update();	    
	});
    }
};

$.fn.extend({
    activityCard: function() {
	return this.each( createActivityCard );
    }
});    
