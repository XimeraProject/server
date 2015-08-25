module.exports = function(grunt) {
    grunt.initConfig({
	pkg: grunt.file.readJSON('package.json'),

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

	revision: {
	    options: {
		property: 'meta.revision',
		ref: 'HEAD',
		short: false
	    }
	},

	sed: {
	    templates: {
		path: 'public/javascripts/app.min.js',
		pattern: "/template/",
		replacement: "/template/<%= meta.revision %>/",
	    },
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

    });

    require('load-grunt-tasks')(grunt);    
    grunt.registerTask('default', []);

    grunt.registerTask('production', ['requirejs', 'revision', 'sed', 'less', 'cssmin']);
};
