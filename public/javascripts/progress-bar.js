var $ = require('jquery');
var _ = require('underscore');

exports.progress = function(n,d) {
    var percent = Math.round(n*100 / d);

    $('.navbar-progress-bar').show();
    
    var progressBar = $('div.progress.completion-meter div.progress-bar.progress-bar-success');
    
    progressBar.attr('aria-valuenow', n);
    progressBar.attr('aria-valuemax', d);
    progressBar.css('width', percent.toString() + '%' );

    // BADBAD: if'd be nicer if I only displayed the string when I knew it wouldn't overflow
    if (percent > 25)
	$('span', progressBar).text( n.toString() + ' of ' + d.toString() );
    else
	$('span', progressBar).text('');

    progressBar.toggleClass('progress-bar-striped', n == d);
};

exports.progressProportion = function(proportion) {
    var percent = Math.round(proportion*10000)/100;

    $('.navbar-progress-bar').show();
    
    var progressBar = $('div.progress.completion-meter div.progress-bar.progress-bar-success');
    
    progressBar.attr('aria-valuenow', Math.round(percent));
    progressBar.attr('aria-valuemax', 100);
    progressBar.css('width', percent.toString() + '%' );
    $('span', progressBar).text('');

    progressBar.toggleClass('progress-bar-striped', proportion > 0.9999);

    var otherProgressBar = $('li.active a.activity-card div.progress-bar.progress-bar-success');
    
    otherProgressBar.attr('aria-valuenow', Math.round(percent));
    otherProgressBar.attr('aria-valuemax', 100);
    otherProgressBar.css('width', percent.toString() + '%' );
    $('span', otherProgressBar).text('');	
};    


var calculateProgress = function(problem, depth) {
    if (depth === undefined)
	depth = 0;

    // Find immediate problem-environment children which aren't hints or feedback
    var children = $(problem).find('.problem-environment').not('.hint').not('.feedback').filter( function() {
	var parents = $(this).parent('.problem-environment');
	return (parents.length == 0) || (parents.first().is(problem)); } );

    // Non-root nodes also contribute to their value via their 'completion' flag
    var nodeValue = 0;
    var nodeMaxValue = 0;
    
    if (depth != 0) {
	if ( $(problem).persistentData('blocking') ) {
	    nodeValue = $(problem).persistentData('complete') ? 1 : 0;
	    nodeMaxValue = 1;
	} else {
	    nodeValue = 1;
	    nodeMaxValue = 1;		
	}
    }

    // Each node's value is the average of its children's values and its own completion flag
    var total = 0;
    children.each( function() {
	total = total + calculateProgress( this, depth + 1 );
    });

    return (total + nodeValue) / (children.length + nodeMaxValue);
};

var activityToMonitor = undefined;

var update = _.debounce( function() {
    var value = calculateProgress( activityToMonitor );

    // Activities that have NO problems will have total progress
    // NaN because of the 0 denominator; let's give credit to
    // students who simply look at such activities
    if (isNaN(value))
	value = 1;

    // Only display progress if there is no invigilator running
    if (!($('#invigilator').data( 'invigilator' ))) {
	exports.progressProportion( value );
    }
    
    // Store the progress as the "score" in the database
    $(activityToMonitor).persistentData( 'score', value );
    // and in a separate "completion" table
    $(activityToMonitor).recordCompletion( value );
}, 300 );

exports.monitorActivity = function( activity ) {
    activityToMonitor = activity;

    update();
    
    $('.problem-environment', activity).each( function() {
	$(this).persistentData( update );
    });
};


