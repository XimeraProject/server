var $ = require('jquery');

var exports = {};

var CLOCK_ID = '#clock';
var running = false;
var displayed = false;
var intervalId = undefined;
var remainingSeconds = 10;

function updateDom () {
    $('.clock-minute', CLOCK_ID).text( ("0" + (Math.floor(remainingSeconds / 60))).slice(-2) );
    $('.clock-second', CLOCK_ID).text( ("0" + (remainingSeconds % 60)).slice(-2) );	
}

function tick() {
    if (remainingSeconds > 0) {
	remainingSeconds = remainingSeconds - 1;
	updateDom();
    } else {
	exports.stop();
    }
}    

exports.reset = function(s) {
    remainingSeconds = s;
};

exports.start = function() {
    running = true;
    intervalId = window.setInterval( tick, 1000 );
    $(CLOCK_ID).css('display','block');
};

exports.stop = function() {
    running = false;
    window.clearInterval( intervalId );
    intervalId = undefined;
};

$(function() {
    //exports.start();
});

    
