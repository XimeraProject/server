define(['jquery', 'underscore'], function($, _) {

    var completions = $.Deferred();
    var activities = $.Deferred();
    
    $(function() {
	// Load the completion data
	var userId = $('[data-user]').attr('data-user');
	
	if (userId) {
	    $.ajax({
		url: '/users/' + userId + '/completions',
		type: 'GET',
		success: function( result ) {
		    completions.resolve( result );
		}	    
	    });
	}

	// Load information about activities related to this commit
	var commit = $('[data-commit]').attr('data-commit');

	if (commit) {
	    $.ajax({
		url: '/commits/' + commit + '/activities',
		type: 'GET',
		success: function( result ) {
		    activities.resolve( result );
		}
	    });
	}
	
    });

    var displayActivity = function( card, content ) {
	$(card).empty();
	$(card).append( $('<div class="progress"><div class="progress-bar progress-bar-success" role="progressbar" style="width: 0%;"></div></div>') );
	$(card).append( $('<h2>' + content.title + '</h2>') );
	$(card).append( $('<h3>' + content.summary + '</h3>') );
    };

    var displayProgress = function( card, progress ) {
	$('.progress-bar', card).css('width', Math.round(progress * 100).toString() + '%' );
    };
    
    var createActivityCard = function() {
	var activityCard = $(this);
	var href = activityCard.attr('data-path');

	$.when(activities).done(function(activities) {
	    var activity = activities[href];

	    displayActivity( activityCard, activity );
	    
	    $.when(completions).done(function(completions) {
		var maxCompletion = 0;
		
		_.each( completions, function(c) {
		    if (_.contains(activity.hashes, c.activityHash))
			if (c.complete > maxCompletion)
			    maxCompletion = c.complete;
		});

		displayProgress( activityCard, maxCompletion );
	    });
	});
    };

    $.fn.extend({
	activityCard: function() {
	    return this.each( createActivityCard );
	}
    });    
    
    return;
});
