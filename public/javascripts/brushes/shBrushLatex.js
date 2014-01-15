/*
 * Improved version of the very simple LaTeX brush from
 * http://www.jorgemarsal.com/blog/
 * some code from Gheorghe Milas and Ahmad Sherif
 */

define(['shCore'], function (shCore) {
    var SyntaxHighlighter = shCore.SyntaxHighlighter;

    function Brush()
    {
	var keywords =  'break continue case return in eq ne gt lt ge le';
	
	this.regexList = [
	    { regex: new RegExp('%.*','gm'),		css: 'comments' },		// one line comments
	    { regex: SyntaxHighlighter.regexLib.doubleQuotedString,			css: 'string' },		// double quoted strings
	    { regex: new RegExp('\\\\\\w*','gm'),			css: 'keyword' },		// commands
	    { regex: new RegExp('\\$[^\\$]+\\$','gm'),			css: 'color2' },		// commands
	    { regex: new RegExp(this.getKeywords(keywords), 'gm'),			css: 'function' },		// keywords
	    ];
	};

    Brush.prototype	= new SyntaxHighlighter.Highlighter();
    Brush.aliases	= ['tex', 'latex', 'LaTeX', 'TeX'];
    
    SyntaxHighlighter.brushes.Latex = Brush;
});
