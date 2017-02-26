var $ = require('jquery');
var _ = require('underscore');
var MathJax = require('./mathjax');

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
	    MathJax.Hub.Queue(["Reprocess",MathJax.Hub,id]);
	}
    });    
};

var reevaluateMathjax = _.debounce(reevaluateMathjaxNow, 250);

exports.reevaluate = function(element) {
    var activity = element.closest('.activity-body');
    
    try {
	$('.javascript', activity ).each( function(i,e) { $(e).triggerHandler( 'ximera:reevaluate' ); } );
    } catch (err)
    {};
    
    $('.inline-javascript', activity ).each( function(i,e) { $(e).triggerHandler( 'ximera:reevaluate' ); } );
    
    reevaluateMathjax(element);
};


