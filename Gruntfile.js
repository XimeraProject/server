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

	requirejs: {
	    compile: {
		options: {
                    name: "../../components/almond/almond",
		    include: "app",
		    baseUrl: "public/javascripts",
		    mainConfigFile: "public/javascripts/app.js",
		    out: "public/javascripts/app.min.js",
		    // necessary to keep angular working
		    optimize: "uglify2",
		    uglify2: {
			// do not mangle functions parameters names---angular needs them!
			mangle: false
		    },
		}
	    }
	},

	less: {
	    compile: {
		options: {
		    paths: ["components/bootstrap/less"],
		    cleancss: true,
		},
		files: {
		    "public/stylesheets/base.css": "public/stylesheets/base.less"
		}
	    }
	},

	cssmin: {
	    combine: {
		options: {
		    root: '.'
		},
		files: {
		    'public/static/base.min.css': ["public/stylesheets/base.css"]
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

    grunt.registerTask('production', ['jison', 'requirejs', 'less', 'cssmin']);
};
