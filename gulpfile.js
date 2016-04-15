"use strict";

var argv = require('yargs').argv,

    gulp       = require('gulp'),
    gutil      = require('gulp-util'),
    gulpif     = require('gulp-if'),

    source     = require('vinyl-source-stream'),
    buffer     = require('vinyl-buffer'),
    sourcemaps = require('gulp-sourcemaps'),
    browserify = require('browserify'),
    watchify   = require('watchify'),
    uglify     = require('gulp-uglify'),
    aliasify   = require('aliasify'),
    babelify   = require('babelify'),
    less       = require('gulp-less'),
    minifyCSS  = require('gulp-minify-css'),
    assign     = require('lodash.assign');

// Directory where static files are found. Don't forget the slash at the end.
var staticDirectoryCSS = './public/stylesheets/';
// but now I am purposefully forgetting the slash?!
var staticDirectoryJavascripts = './public/javascripts';

// Source and target JS files for Browserify
var jsMainFile      = './public/javascripts/main.js';
var jsBundleFile    = 'main.min.js';

// Source and target LESS files
var cssMainFile     = './public/stylesheets/base.less';
var cssFiles        = './public/stylesheets/**/*.less';

// Browserify bundler
var options = {
    entries: [jsMainFile],
    transform: [
	[aliasify],
	[babelify, {
	    global: true,
	    ignore: /\/node_modules\/(?!syntaxhighlighter|brush-)/,
	    presets: ["es2015", "react"]
	}]
    ],
    extensions: ['.js'],
    debug: !argv.production,
    cache: {}, packageCache: {}, fullPaths: true // for watchify
};

var completeOptions = assign({}, watchify.args, options);
var bundler = browserify(completeOptions);

function buildPipeline(b) {
    return b
        .bundle()
        .pipe(source(jsBundleFile))
        .pipe(buffer())
        .pipe(gulpif(!argv.production, sourcemaps.init({loadMaps: true}))) // loads map from browserify file
        .pipe(gulpif(!argv.production, sourcemaps.write('./', {sourceMappingURLPrefix: '.'}))) // writes .map file
        .pipe(gulpif(argv.production, uglify()))
        .pipe(gulp.dest(staticDirectoryJavascripts));
}

// Build JavaScript using Browserify
gulp.task('js', function() {
    return buildPipeline(bundler);
});

// Build CSS
gulp.task('css', function(){
    return gulp.src(cssMainFile)
        .pipe(less())
        .pipe(gulpif(argv.production, minifyCSS({keepBreaks:true})))
        .pipe(gulp.dest(staticDirectoryCSS));
});

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

gulp.task('watch', ['watchify', 'csswatch']);
gulp.task('default', ['js', 'css']);

