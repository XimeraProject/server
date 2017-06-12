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
var validator = require('./validator');
var javascript = require('./javascript');

var connectInteractives = require('./interactives').connectInteractives;

var annotator = require('./annotator');

var createActivity = function() {
    var activity = $(this);

    console.log("ACTIVITY");

    //$('.activity-body', this).annotator();
    
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

		// BADBAD: Arguably this should happen AFTER some of the other set up below?
		ProgressBar.monitorActivity( activity );
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
	$(".validator", activity).validator();
	$(".inline-javascript", activity).javascript();

	connectInteractives();
	
	$('.activity-card').activityCard();
    });
};

$.fn.extend({
    activity: function() {
	return this.each( createActivity );
    },

    recordCompletion: function(proportionComplete) {
	var hash = $(this).activityHash();

	var payload = {complete: proportionComplete};
	
	if (hash != undefined) {
	    var repositoryName = $(this).repositoryName();
	    if (repositoryName) {
		payload.repositoryName = repositoryName;
	    }

	    var activityPath = $(this).activityPath();
	    if (activityPath) {
		payload.activityPath = activityPath;
	    }	    
	    
	    $.ajax({
		url: '/completion/' + hash,
		type: 'PUT',
		data: JSON.stringify(payload),
		contentType: 'application/json',
		success: function( result ) {
		    console.log( "recording completion " + JSON.stringify(payload) + " for " + hash );
		},
	    });
	}

	return;
    },
});    

