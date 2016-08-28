var $ = require('jquery');
var _ = require('underscore');
var MathJax = require('mathjax');
var TinCan = require('./tincan');
var ProgressBar = require('./progress-bar');

var activityCard = require('./activity-card');
var problem = require('./problem');
var mathAnswer = require('./math-answer');
var multipleChoice = require('./multiple-choice');
var selectAll = require('./select-all');
var wordChoice = require('./word-choice');
var hint = require('./hint');
var foldable = require('./foldable');

var freeResponse = require('./free-response');
var shuffle = require('./shuffle');
var feedback = require('./feedback');

var connectInteractives = require('./interactives').connectInteractives;

var createActivity = function() {
    var activity = $(this);

    console.log("ACTIVITY");

    activity.fetchData( function(db) {
	activity.persistentData( function() {
	    if (!(activity.persistentData( 'experienced' ))) {
		TinCan.experience(activity);
		activity.persistentData( 'experienced', true );
	    }
	});

	var firstTime = true;
	
	MathJax.Hub.Register.MessageHook( "End Process", function(message) {
	    if (firstTime) {
		console.log("End Process (1st time)");
		$(".mathjax-input", activity).mathAnswer();
		firstTime = false;
	    }
	});

	$(".problem-environment", activity).problemEnvironment();
	$(".mathjax-input", activity).mathAnswer();	    
	$(".multiple-choice", activity).multipleChoice();
	$(".select-all", activity).selectAll();
	$(".word-choice", activity).wordChoice();
	$(".hint", activity).hint();
	$(".foldable", activity).foldable();
	$(".free-response", activity).freeResponse();
	
	$(".shuffle", activity).shuffle();
	$(".feedback", activity).feedback();	    

	connectInteractives();
	
	$('.activity-card').activityCard();

	ProgressBar.monitorActivity( activity );
    });
};

$.fn.extend({
    activity: function() {
	return this.each( createActivity );
    },

    recordCompletion: function(proportionComplete) {
	var hash = $(this).activityHash();

	if (hash != undefined) {
	    $.ajax({
		url: '/completion/' + hash,
		type: 'PUT',
		data: JSON.stringify({complete: proportionComplete}),
		contentType: 'application/json',
		success: function( result ) {
		    console.log( "recording completion for " + hash );
		},
	    });
	}

	return;
    },
});    

