console.log("This is standalone.js");
console.log("  ▀██▄   ▄██▀ ██ █████     █████ ▄███████████████████▄    ███");
console.log("    ▀██▄██▀   ██▐██ ▐██   ██▌ ██▌██                 ██▌  ██▀██");
console.log("      ███     ██▐██  ██▌ ▐██  ██▌▐█████████ ▄████████▀  ██▀ ▀██");
console.log("    ▄██▀██▄   ██▐██  ▐██ ██▌  ██▌██        ▐█▌  ▀██▄   ██▀   ▀██");
console.log("  ▄██▀   ▀██▄ ██▐██   ▀███▀   ██▌▀█████████▐█▌    ▀██▄██▀     ▀██");

// bootstrap is expecting a global jQuery object
var $ = window.$ = window.jQuery = require('jquery');

var Expression = require('math-expressions');

var jqueryUI = require('jquery-ui');
var jqueryTransit = require('jquery.transit');
var tether = require('tether');
window.Tether = tether;
var bootstrap = require('bootstrap');
var kinetic = require('jquery.kinetic/jquery.kinetic.min.js');

window.standalone = true;
var MathJax = require('./mathjax');

MathJax.Hub.Register.MessageHook("TeX Jax - parse error",function (message) {
    // do something with the error.  message[1] will contain the data about the error.
    console.log(message);
});

MathJax.Hub.Register.MessageHook("Math Processing Error",function (message) {
    //  do something with the error.  message[2] is the Error object that records the problem.
    console.log(message);
});
     
MathJax.Hub.Register.StartupHook("TeX Jax Ready",function () {
    // Remove CDATA's from the script tags
    MathJax.InputJax.TeX.prefilterHooks.Add(function (data) {
	data.math = data.math.replace(/<!\[CDATA\[\s*((.|\n)*)\s*\]\]>/m,"$1");
    });
});

MathJax.Hub.Configured();

$(document).ready(function() {
    MathJax.Hub.Startup.onload();
});

console.log("done.");
