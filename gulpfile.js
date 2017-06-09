/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */

require('es6-promise').polyfill(); /* usemin requires this */
var gulp = require('gulp');
var less = require('gulp-less');
var lesshint = require('gulp-lesshint');
var path = require('path');
var plumber = require('gulp-plumber');

var PATHS = {
  src: [
    'app/src/loader.ts',
    'app/src/**/*.ts',
    'tools/typings/**/*.ts',
    'app/styles/**/*.less'
  ],
  assets: [
    'app/assets/**/*.*'
  ],
  dice_words: [
    'app/dice-words/**/*.*'
  ],
  loading: [
    'app/loading/**/*.*'
  ],
  html: [
    'app/**/*.html'
  ],
  libjs: [
    'app/src/lib/**/*.js'
  ],
  tshelpers: [
    'app/src/tshelpers.js'
  ],
  electron: [
    'app/electron.js',
    'app/package.json'
  ]
};

gulp.task('usemin', function() {
  var usemin = require('gulp-usemin');
  var uglify = require('gulp-uglify');
  var minifyCss = require('gulp-minify-css');
  var rev = require('gulp-rev');
  return gulp.src('app/index.html')
    .pipe(usemin({
      css: [ minifyCss(), rev() ],
      js: [ uglify(), rev() ],
      chart: [ uglify(), rev() ],
      inlinejs: [ uglify(), 'concat' ],
      inlinecss: [ minifyCss(), 'concat' ]
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('clean', function (done) {
  var del = require('del');
  del(['dist'], done);
});

gulp.task('libjs', function () {
  var concat = require('gulp-concat');
  var uglify = require('gulp-uglify');
  gulp.src(PATHS.libjs)
    .pipe(concat('lib.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

gulp.task('tshelpers', function () {
  var concat = require('gulp-concat');
  gulp.src(PATHS.tshelpers)
    .pipe(concat('tshelpers.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('ts2js', function () {
  var typescript = require('gulp-typescript');
  var sourcemaps = require('gulp-sourcemaps');
  var concat = require('gulp-concat');
  var tscConfig = require('./tsconfig.json');
  var extend = require('util')._extend;

  gulp.src(PATHS.src)
    .pipe(sourcemaps.init())
    .pipe(typescript(extend(tscConfig.compilerOptions, { sortOutput: true })))
    .pipe(concat('heat-ui.js'))
    .pipe(sourcemaps.write('../dist/maps'))
    .pipe(gulp.dest('dist'));
});

gulp.task('copy:dist', ['tshelpers','libjs'], function () {
  gulp.src(PATHS.assets)
    .pipe(gulp.dest('dist/assets'));
  gulp.src(PATHS.dice_words)
    .pipe(gulp.dest('dist/dice-words'));
  gulp.src(PATHS.loading)
    .pipe(gulp.dest('dist/loading'));
  gulp.src(PATHS.html)
    .pipe(gulp.dest('dist'));
  gulp.src(PATHS.electron)
    .pipe(gulp.dest('dist'));
});

gulp.task('less', function () {
    return gulp.src('./app/styles/index.less')
    .pipe(plumber())
      .pipe(less({
          paths: [path.join(__dirname, 'less', 'includes')]
      }))
      .pipe(gulp.dest('./dist/styles/'));
});

gulp.task('play', ['ts2js','copy:dist', 'less'], function () {
  var http = require('http');
  var connect = require('connect');
  var serveStatic = require('serve-static');
  //var open = require('open'); // open browser window
  //var path = require('path');

  var port = 9001, app;

  gulp.watch(PATHS.src.concat(PATHS.html), ['ts2js', 'copy:dist', 'less']);

  app = connect().use(serveStatic(__dirname));
  http.createServer(app).listen(port, function () {
    //open('http://localhost:' + port + '/dist');
  });
});

gulp.task('build', ['clean','ts2js','usemin','copy:dist','less'], function () {
  var replace = require('gulp-replace');
  return gulp.src('dist/index.html')
    .pipe(replace('<script src="node_modules-', '<script defer src="node_modules-'))
    .pipe(replace('<script src="charting-', '<script defer src="charting-'))
    .pipe(gulp.dest('dist'));
});

gulp.task('electron', function () {
  gulp.src('app/electron/*')
    .pipe(gulp.dest('dist/electron'));
  gulp.src(['app/node_modules/**/*'])
    .pipe(gulp.dest('dist/node_modules'));
});

gulp.task('lint', function () {
  return gulp.src('app/styles/**/*.less')
    .pipe(lesshint({
        // Options
    }))
    .pipe(lesshint.reporter())
    .pipe(lesshint.failOnError());
});

gulp.task('default', ['play']);
