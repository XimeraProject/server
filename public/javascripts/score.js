var $ = require('jquery');
var bootstrap = require('bootstrap');

var scoreXarma = undefined;
var scoreXudos = undefined;

var update = function() {
    if (scoreXarma) {
	$('.xarma').toggle(scoreXarma != 0);
	
	var xarma = $('#score-xarma');

	if (xarma.text() != scoreXarma.toString()) {
	    if (xarma.text().length > 0)
		$(".xarma").effect("highlight", {}, 3000);
	    
	    xarma.text( scoreXarma.toString() );
	}
    }

    if (scoreXudos) {
	$('.xudos').toggle(scoreXudos != 0);
	
	var xudos = $('#score-xudos');
	
	if (xudos.text() != scoreXudos.toString()) {
	    if (xudos.text().length > 0)
		$(".xudos").effect("highlight", {}, 3000);
	    
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

