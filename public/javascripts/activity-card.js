var $ = require('jquery');
var _ = require('underscore');

var completions = $.Deferred();

$(function() {
    // Load the completion data
    var userId = $('[data-user]').attr('data-user');
    
    if (userId) {
	$.ajax({
	    url: '/users/' + userId + '/completions' + '?' + (new Date().getTime().toString()),
	    type: 'GET',
	    success: function( result ) {
		completions.resolve( result );
	    }	    
	});
    }
    
});

var displayProgress = function( card, progress ) {
    $('.progress-bar', card).css('width', Math.round(progress * 100).toString() + '%' );
};

var createActivityCard = function() {
    var activityCard = $(this);
    var href = activityCard.attr('data-path');

    // This is the historical method for storing completion data
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
	});

	return;
    } // else

    // DEPRECATED: This is the historical method for storing completion data
    var hashes = activityCard.attr('data-hashes');
    
    if (hashes) {
	hashes = JSON.parse(hashes);
	
	$.when(completions).done(function(completions) {
	    var maxCompletion = 0;
	    
	    _.each( completions, function(c) {
		if (_.contains(hashes, c.activityHash))
		    if (c.complete > maxCompletion)
			maxCompletion = c.complete;
	    });
	    
	    displayProgress( activityCard, maxCompletion );
	});
    }

    // BADBAD: now we also try to load the data some other way
};

$.fn.extend({
    activityCard: function() {
	return this.each( createActivityCard );
    }
});    
