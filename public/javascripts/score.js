define(['jquery', 'underscore'], function($, _) {

    var scoreXarma = undefined;
    var scoreXudos = undefined;
    var exports = {};

    var update = function() {
	if (scoreXarma) {
	    var xarma = $('#score-xarma');

	    if (xarma.text() != scoreXarma.toString()) {
		if (xarma.text().length > 0)
		    $(".xarma").effect("highlight", {}, 3000);
		
		console.log( "update xarma" );	    
		
		xarma.text( scoreXarma.toString() );
	    }
	}

	if (scoreXudos) {
	    var xudos = $('#score-xudos');
	    
	    if (xudos.text() != scoreXudos.toString()) {
		if (xudos.text().length > 0)
		    $(".xudos").effect("highlight", {}, 3000);
		
		console.log( "update xudos" );	    	    
		
		xudos.text( scoreXudos.toString() );
	    }
	}
    };
    
    // When the document is ready...
    $(function() {
	$.ajax({
	    url: '/users/xarma',
	    type: 'GET',
	    success: function( result ) {
		scoreXarma = parseInt(result);
		update();
	    }
	});

	$.ajax({
	    url: '/users/xudos',
	    type: 'GET',
	    success: function( result ) {
		scoreXudos = parseInt(result);
		update();		
	    }
	});	
	
    });

    exports.earnXarma = function(points) {
	scoreXarma += points;
	update();

	$.ajax({
	    url: '/users/xarma',
	    data: {points: points},
	    type: 'POST'
	});		
    };

    exports.earnXudos = function(points) {
	scoreXudos += points;
	update();

	$.ajax({
	    url: '/users/xudos',
	    data: {points: points},
	    type: 'POST'
	});			
    };

    return exports;
});
