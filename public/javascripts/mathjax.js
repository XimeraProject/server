window.MathJax = {
    delayStartupUntil : "configured",

    jax: ["input/TeX","output/HTML-CSS"],
    extensions: ["tex2jax.js","MathMenu.js","MathZoom.js", "fast-preview.js", "CHTML-preview.js", "toMathML.js", "AssistiveMML.js", "a11y/accessibility-menu.js"],

    "HTML-CSS": {
	availableFonts: ["TeX"],
	imageFont: null
    },
	
    processEnvironments: true,
    showProcessingMessages: false,

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
    
    AuthorInit : function() {
        MathJax.Ajax.config.root = "/node_modules/mathjax";
    }    
};

require('mathjax2');

module.exports = window.MathJax;
