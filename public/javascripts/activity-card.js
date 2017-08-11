var $ = require('jquery');
var _ = require('underscore');
var gradebook = require('./gradebook');

var completions = $.Deferred();

var users = require('./users');

$(function() {
    // Load the completion data
    users.me().then( function(user) {
	$.ajax({
	    url: '/users/' + user._id + '/completions' + '?' + (new Date().getTime().toString()),
	    type: 'GET',
	    success: function( result ) {
		completions.resolve( result );
	    }	    
	});
    });
});

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
	$.when(completions).done(function(completions) {
	    var maxCompletion = 0;
	    
	    _.each( completions, function(c) {
		if ((c.activityPath == activityPath) && (c.repositoryName == repositoryName)) 
		    if (c.complete > maxCompletion)
			maxCompletion = c.complete;
	    });

	    displayProgress( activityCard, maxCompletion );
	    activityCard.attr('data-max-completion', maxCompletion );
	    gradebook.update();
	});
    }
};

$.fn.extend({
    activityCard: function() {
	return this.each( createActivityCard );
    }
});    
