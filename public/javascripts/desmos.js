var $ = require('jquery');

var DesmosNeeded = false;

exports.promise = $.Deferred();

exports.onReady = function( callback ) {
    $.when(exports.promise).done( callback );
};

exports.loadAsynchronously = function() {
    if (DesmosNeeded == false) {
	DesmosNeeded = true;
		
	$.getScript( "https://www.desmos.com/api/v0.7/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6", 
		     function() {
			 function waitForDesmos(){
			     if(typeof window.Desmos !== "undefined"){
				 exports.promise.resolve( window.Desmos );
			     } else {
				 setTimeout(function(){
				     waitForDesmos();
				 },250);
			     }
			 }
			 
			 waitForDesmos();
		     });
    }
};
