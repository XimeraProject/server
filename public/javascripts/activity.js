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
var youtube = require('./youtube');

var freeResponse = require('./free-response');
var shuffle = require('./shuffle');
var feedback = require('./feedback');
var validator = require('./validator');
var javascript = require('./javascript');

var connectInteractives = require('./interactives').connectInteractives;

var database = require('./database');

var annotator = require('./annotator');

var createActivity = function() {
    var activity = $(this);

    //$('.activity-body', this).annotator();
    
    activity.fetchData( function() {
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
		firstTime = false;
		// BADBAD: Arguably this should happen AFTER some of the other set up below?
		ProgressBar.monitorActivity( activity );
	    }
	});

	$(".problem-environment", activity).problemEnvironment();
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
	$('.youtube-player', activity).youtube();
	
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

	if (hash != undefined) {
	    var repositoryName = $(this).repositoryName();
	    var activityPath = $(this).activityPath();

	    database.setCompletion( repositoryName, activityPath, proportionComplete );
	}

	return;
    }
});    

