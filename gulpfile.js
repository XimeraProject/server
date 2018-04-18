"use strict";

var argv = require('yargs').argv,

    gulp       = require('gulp'),
    gutil      = require('gulp-util'),
    gulpif     = require('gulp-if'),
    puglint    = require('gulp-pug-lint'),
    source     = require('vinyl-source-stream'),
    buffer     = require('vinyl-buffer'),
    sourcemaps = require('gulp-sourcemaps'),
    browserify = require('browserify'),
    watchify   = require('watchify'),
    aliasify   = require('aliasify'),
    babelify   = require('babelify'),
    sass       = require('gulp-sass'),
    minifyCSS  = require('gulp-minify-css'),
    assign     = require('lodash.assign');

// Directory where static files are found. Don't forget the slash at the end.
var staticDirectoryCSS = './public/stylesheets/';
// but now I am purposefully forgetting the slash?!
var staticDirectoryJavascripts = './public/javascripts';

// Source and target JS files for Browserify
var jsMainFile                = './public/javascripts/main.js';
var jsBundleFile              = 'main.min.js';
var jsServiceWorkerFile       = './public/javascripts/sw.js';
var jsServiceWorkerBundleFile = 'sw.min.js';

// Source and target SCSS files
var cssMainFile     = './public/stylesheets/base.scss';
var cssFiles        = './public/stylesheets/**/*.scss';

////////////////////////////////////////////////////////////////
// Browserify bundler
var options = {
    entries: [jsMainFile],
    transform: [
	[aliasify],
	[babelify, {
	    global: true,
	    ignore: /\/node_modules\/(?!syntaxhighlighter|brush-)/,
	    "presets": [
		["env", {
		    "targets": {
			"browsers": ["last 2 versions", "safari >= 7"]
		    }
		}]
	    ]
	}]
    ],
    extensions: ['.js'],
    cache: {}, packageCache: {}, fullPaths: true // for watchify
};

var completeOptions = assign({}, watchify.args, options);
var bundler = browserify(completeOptions);

function buildPipeline(b) {
    return b
        .bundle()
        .pipe(source(jsBundleFile))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
        .pipe(sourcemaps.write('./', {sourceMappingURLPrefix: '.'})) // writes .map file
        .pipe(gulp.dest(staticDirectoryJavascripts));
}

// Build JavaScript using Browserify
gulp.task('js', function() {
    return buildPipeline(bundler);
});

////////////////////////////////////////////////////////////////
// Bundler for the service worker
var serviceWorkerBundler = browserify({
    entries: [jsServiceWorkerFile],
    transform: [
	[aliasify],
	[babelify, {
	    global: true,
	    "presets": [
		["env", {
		    "targets": {
			"browsers": ["last 2 versions", "safari >= 7"]
		    }
		}]
	    ]
	}]
    ],
    extensions: ['.js'],
    cache: {}, packageCache: {}, fullPaths: true // for watchify
});

function buildServiceWorkerPipeline(b) {
    return b
        .bundle()
        .pipe(source(jsServiceWorkerBundleFile))
        .pipe(buffer())
        .pipe(gulpif(!argv.production, sourcemaps.init({loadMaps: true}))) // loads map from browserify file
        .pipe(gulpif(!argv.production, sourcemaps.write('./', {sourceMappingURLPrefix: '.'}))) // writes .map file
        .pipe(gulp.dest(staticDirectoryJavascripts));
}

// Build JavaScript using Browserify
gulp.task('service-worker', function() {
    return buildServiceWorkerPipeline(serviceWorkerBundler);
});

////////////////////////////////////////////////////////////////
// Build CSS
gulp.task('css', function(){
    return gulp.src(cssMainFile)
        .pipe(sass())
        .pipe(gulpif(argv.production, minifyCSS({keepBreaks:true})))
        .pipe(gulp.dest(staticDirectoryCSS));
});

////////////////////////////////////////////////////////////////
// Watch JS + CSS using watchify + gulp.watch

gulp.task('watchify', function() {
    var watcher  = watchify(bundler);
    return watcher
	.on('error', gutil.log.bind(gutil, 'Browserify Error'))
        .on('log', gutil.log) // output build logs to terminal
	.on('update', function () {
	    buildPipeline(watcher);
            gutil.log("Updated JavaScript sources");
    })
    .bundle() // Create the initial bundle when starting the task
    .pipe(source(jsBundleFile))
    .pipe(gulp.dest(staticDirectoryCSS));
});

gulp.task('csswatch', function () {
    gulp.watch(cssFiles, ['css']);
});

gulp.task('service-worker-watch', function () {
    gulp.watch([jsServiceWorkerFile], ['service-worker']);
});

gulp.task('lint', function () {
    return gulp
	.src('views/**/*.pug')
	.pipe(puglint());
});

gulp.task('watch', ['watchify', 'csswatch', 'service-worker-watch']);
gulp.task('default', ['js', 'css', 'service-worker']);

