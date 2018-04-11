var $ = require('jquery');
var _ = require('underscore');

$( function() {
    // Only activities get the pencil
    if ($('main.activity').length == 0)
	return;

    var pencilDiv;
    if ($("#pencil").length > 0) {
	pencilDiv = $("#pencil").first();
    } else {
	pencilDiv = $('<svg id="pencil"></svg>');
	$('div.container-fluid').append( pencilDiv );
    }

    var drawn = {};
    var maxCounter = 0;
    
    pencilDiv.fetchData( function() {
	pencilDiv.persistentData( function(event) {
	    // When erase, let's actually clear things
	    if (Object.keys( event.data ).length == 0) {
		drawn = {};
		pencilDiv.empty();
	    }
	    
	    Object.keys( event.data ).forEach( function(key) {
		if (parseInt(key) > maxCounter)
		    maxCounter = parseInt(key);
		
		if (drawn[key] !== true) {
		    var stroke = event.data[key];
		    drawn[key] = true;
		    drawLine( stroke.x1, stroke.y1, stroke.x2, stroke.y2 );
		}
	    });
	});
    });
    
    var parent = $('div.container-fluid');
    
    pencilDiv.css( 'position', 'absolute' );
    pencilDiv.css( 'top', '0' );
    pencilDiv.css( 'left', '0' );            
    pencilDiv.css( 'width', '100%' );
    pencilDiv.css( 'height', '100%' );
    pencilDiv.css( 'overflow', 'visible' );    
    pencilDiv.css( 'z-index', '1029' );
    pencilDiv.css( 'pointer-events', 'none' );
    
    var drawing = false;
    var lastX = undefined;
    var lastY = undefined;

    function drawLine( ax, ay, bx, by ) {
	var newLine = document.createElementNS('http://www.w3.org/2000/svg','line');
	newLine.setAttribute('id','line2');
	newLine.setAttribute('x1',ax);
	newLine.setAttribute('y1',ay);
	newLine.setAttribute('x2',bx);
	newLine.setAttribute('y2',by);
	newLine.setAttribute('stroke','black');    
	$("#pencil").append(newLine);
    }
    
    parent.on( "touchstart", function(e) {
	if (e.touches[0].touchType !== "stylus") return;
	
	var touch = e.touches[0];
	drawing = true;

	lastX = touch.pageX - parent.offset().left;
	lastY = touch.pageY - parent.offset().top;

	e.preventDefault();	
    });

    parent.on( "touchend", function(e) {
	if (drawing == false) return;
	
	drawing = false;
	e.preventDefault();
    });

    parent.on( "touchmove", function(e) {
	if (drawing == false) return;
	
	var touch = e.touches[0];

	var bx = touch.pageX - parent.offset().left;
	var by = touch.pageY - parent.offset().top;
	var ax = lastX;
	var ay = lastY;
	drawLine( ax, ay, bx, by );

	maxCounter = maxCounter + 1;
	var uuid = maxCounter.toString();
	drawn[uuid] = true;
	pencilDiv.persistentData( uuid, { 'x1': ax, 'y1': ay, 'x2': bx, 'y2': by } );
	
	lastX = touch.pageX - parent.offset().left;
	lastY = touch.pageY - parent.offset().top;
	
	e.preventDefault();	
    });        
});
