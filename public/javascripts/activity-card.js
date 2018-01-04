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

    ////////////////////////////////////////////////////////////////
    // add counters
    var itself = 0;
    if (activityCard.hasClass('chapter')) itself = 1;
    activityCard.attr( 'data-chapter-counter', activityCard.prevAll('.activity-card.chapter').length + itself );
    var label = activityCard.attr( 'data-chapter-counter' );
    
    if (!(activityCard.hasClass('chapter'))) {
	activityCard.attr( 'data-section-counter', activityCard.prevUntil('.activity-card.chapter', '.activity-card' ).not('.part').length + 1 );
	label = label + "." +  activityCard.attr( 'data-section-counter' );
    }

    if ((activityCard.attr( 'data-chapter-counter' ) != "0") && (!(activityCard.hasClass('part')))) {
	$('h4', activityCard).prepend( '<span class="card-number">' + label + '</span>' );
    }
	
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
