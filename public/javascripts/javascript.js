var $ = require('jquery');
var _ = require('underscore');
var MathJax = require('./mathjax');

$( function() {
    var anyRandomness = false;
    
    $('.javascript script').each( function() {
	if ($(this).html().match( /random/ ))
	    anyRandomness = true;
    });

    if (anyRandomness) {
	$("#show-me-another-button").show();

	var seedDiv;
	if ($("#seed").length > 0) {
	    seedDiv = $("#seed").first();
	} else {
	    seedDiv = $('<div id="seed" style="display: none;"></div>');
	    $('main.activity .activity-body').append( seedDiv );
	}
	
	seedDiv.fetchData( function() {
	    seedDiv.persistentData( function() {
		var newSeed = seedDiv.persistentData('seed');
		
		if (newSeed !== undefined) {
		    Math.seedrandom(newSeed);
		} else {
		    var activityPath = $('main.activity').attr( 'data-path' );
		    var currfilebase = activityPath.split('/').slice(-1)[0];		
		    Math.seedrandom(currfilebase);
		}
		console.log("newSeed=", newSeed);
		console.log("reevaluate",seedDiv);
		
		$('.javascript script').each( function() {
		    $.globalEval( $(this).html() );
		});
		exports.reevaluate( seedDiv );
	    });
	});
    }
});

var createJavascript = function() {
    var element = $(this);

    element.on( 'ximera:reevaluate', function(event) {
	var value = $('<span class="value"></span>');
	if ($('.value', element).length > 0) {
	    value = $('.value', element);
	} else {
	    element.append( value );
	}

	try {
	    value.text( window[element.attr('id')].call(this).toString() );
	} catch (err) {
	    value.html( '&#9633;' );
	};
    });

    element.trigger( 'ximera:reevaluate' );
};

$.fn.extend({
    javascript: function() {
	return this.each( createJavascript );
    }
});

var evaluateLatex = exports.evaluateLatex = function(code) {
    var value;
    
    try {
	value = eval(code);

	if (typeof value === "number") { 
	    value = value.toString();
	}
	
	if (typeof value.tex !== "undefined") { 
	    value = value.tex();
	}

	value = value.toString();
    } catch(err) {
	value = '\\square';
    }

    return value;
};

var reevaluateMathjaxNow = function(element) {
    var activity = element.closest('.activity-body');

    var ids = new Set();
	
    $('.mathjax-javascript', activity ).each( function(i,e) {
	var value;
	var code = $(e).attr('data-code');
	try {
	    value = evaluateLatex(code);
	} catch(err) {
	    value = '\\square';
	}

	if (value != $(e).attr('data-value')) {
	    var id = $(e).closest(".MathJax").attr('id').replace('-Frame', '');
	    ids.add(id);
	}
    });

    ids.forEach( function(id) {
	MathJax.Hub.Queue(["Reprocess",MathJax.Hub,id]);
    });
};

var reevaluateMathjax = _.debounce(reevaluateMathjaxNow, 250);

exports.reevaluate = function(element) {
    var activity = element.closest('.activity-body');
    
    $('.inline-javascript', activity ).each( function(i,e) { $(e).triggerHandler( 'ximera:reevaluate' ); } );
    
    reevaluateMathjax(element);
};


