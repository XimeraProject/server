module.exports = function(grunt) {
    grunt.initConfig({
	pkg: grunt.file.readJSON('package.json'),

	/****************************************************************/
	// I use jison for the lexer for the algebra parser
	jison: {
	    target: {
		options: { moduleType: 'amd' },
		files: {
		    'public/javascripts/algebra/lexer.js': 'public/javascripts/algebra/lexer.jison',
		    'public/javascripts/algebra/latex-lexer.js': 'public/javascripts/algebra/latex-lexer.jison'
		}
	    }
	},

	/****************************************************************/
	watch: {
	    jison: {
		files: ['public/javascripts/algebra/*.jison'],
		tasks: ['jison']
	    }
	},

    });

    require('load-grunt-tasks')(grunt);    
    grunt.registerTask('default', ['jison']);
};
