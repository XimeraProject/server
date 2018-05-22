window.MathJax = {
    delayStartupUntil : "configured",

    jax: ["input/TeX","output/HTML-CSS"],
    extensions: ["tex2jax.js","MathMenu.js","MathZoom.js", "toMathML.js", "AssistiveMML.js", "[a11y]/accessibility-menu.js"],

    tex2jax: {preview: "none"},
    
    "HTML-CSS": {
	availableFonts: ["TeX"],
	imageFont: null
    },
	
    processEnvironments: true,
    showProcessingMessages: false,
    messageStyle: 'none',
    
    // BADBAD: this also breaks the layout triggers
    // showMathMenu: false,
    
    TeX: {
	equationNumbers: { autoNumber: "AMS" },
	extensions: ["AMSmath.js","AMSsymbols.js","noErrors.js","noUndefined.js","color.js","cancel.js"],
	Macros: {
	    xspace: '',
	    ensuremath: ''
	}
    },

    root: "/node_modules/mathjax/"
};

if (window.standalone)
    window.MathJax.root = "http://localhost:3000/node_modules/mathjax";

require('mathjax2');

module.exports = window.MathJax;
