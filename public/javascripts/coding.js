var $ = require('jquery');
var _ = require('underscore');
var database = require('./database');
var CodeMirror = require('codemirror');
require('codemirror-javascript');

var createCoding = function() {
    var element = $(this);

    var initialContent = $('script',element).text();
    $('script',element).remove();
    
    var myCodeMirror = CodeMirror(element.get(0), {
	value: "",
	mode:  "javascript",
	lineNumbers: true,
	lineWrapping: true,
    });

    // update database from view
    myCodeMirror.on( "changes", function (e) {
	$(element).persistentData( 'code', myCodeMirror.getValue() );
    });

    // update view from database
    $(element).persistentData( function(event) {
	console.log(event);
	if ( ! $(element).persistentData('code')) {
	    console.log("empty code");
	    myCodeMirror.setValue( initialContent );
	}
	
	if ('code' in event.data) {
	    if (event.data['code'] != myCodeMirror.getValue()) {
		myCodeMirror.setValue( event.data['code'] );
	    }
	}
    });

    var button = $('<button type="button" class="btn btn-primary"><i class="fa fa-play"></i>&nbsp;Run</button>');
    element.append( button );
    button.wrapInner( $('<div class="btn-group" role="group" aria-label="Basic example">') );

    button.click( function() {
	$('#p5-canvas',element).remove();
	element.append( $('<div id="p5-canvas"></div>') );
	$('#p5-canvas',element).css( 'width', '750px' );
	$('#p5-canvas',element).css( 'height', '500px' );

	$('#p5-canvas').hover(function() {
	    console.log('DISABLE');
	    $(document).keydown(function(e) {
		var key = e.which;
		if(key==35 || key == 36 || key == 37 || key == 39) {
		    e.preventDefault();
		    return false;
		}
		return true;
	    });
	}, function() {
	    //$("body").css("overflow","auto");
	});
	
	var prefix = 'for(var k in p) { window[k]=p[k]; if (window[k] && window[k].bind) window[k] = window[k].bind(p); } ; var width = 750; var height = 500;';
	var sneaky = Function('p', prefix + myCodeMirror.getValue() );
	window.sketch = sneaky;
	new window.p5(sneaky, 'p5-canvas');
    });
		  
    return;
};

$.fn.extend({
    coding: function() {
	return this.each( createCoding );
    }
});

