define(['jquery', 'underscore'], function($, _){

    var exports = {};

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
    };    
    

    var calculateProgress = function(problem, depth) {
	if (depth === undefined)
	    depth = 0;

	// Find immediate problem-environment children which aren't hints
	var children = $(problem).find('.problem-environment').not('.hint').filter( function() {
	    var parents = $(this).parent('.problem-environment');
	    return (parents.length == 0) || (parents.first().is(problem)); } );
	
	var nodeValue = 0;
	var nodeMaxValue = 0;
	
	if (depth != 0) {
	    nodeValue = $(problem).persistentData('complete') ? 1 : 0;
	    nodeMaxValue = 1;
	}

	var total = 0;

	children.each( function() {
	    total = total + calculateProgress( this, depth + 1 );
	});

	return (total + nodeValue) / (children.length + nodeMaxValue);
    };


    var activityToMonitor = undefined;
    
    var update = _.debounce( function() {
	exports.progressProportion( calculateProgress( activityToMonitor ) );
    }, 300 );
       
    exports.monitorActivity = function( activity ) {
	activityToMonitor = activity;
	
	$('.problem-environment', activity).each( function() {
	    $(this).persistentData( update );
	});
    };
    
    return exports;
});
