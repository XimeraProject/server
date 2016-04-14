/*
 * Improved version of the very simple LaTeX brush from
 * http://www.jorgemarsal.com/blog/
 * some code from Gheorghe Milas and Ahmad Sherif
 */

var BrushBase = require('brush-base');
var regexLib = require('syntaxhighlighter-regex').commonRegExp;

function Brush() {
    var keywords =  'break continue case return in eq ne gt lt ge le';
	
    this.regexList = [
	// one line comments
	{ regex: new RegExp('%.*','gm'),
	  css: 'comments' },
	// double quoted strings	
	{ regex: regexLib.doubleQuotedString,
	  css: 'string' },
	// commands
	{ regex: new RegExp('\\\\\\w*','gm'),
	  css: 'keyword' },
	// commands	
	{ regex: new RegExp('\\$[^\\$]+\\$','gm'),
	  css: 'color2' },
	// keywords	
	{ regex: new RegExp(this.getKeywords(keywords), 'gm'),
	  css: 'function' },
    ];

  this.forHtmlScript(regexLib.scriptScriptTags);    
}

Brush.prototype	= new BrushBase();
Brush.aliases	= ['tex', 'latex', 'LaTeX', 'TeX'];
module.exports = Brush;
