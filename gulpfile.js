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
var lesshint = require('gulp-lesshint');
var path = require('path');
var gutil = require('gulp-util');

/* These are the hashed new names for lib.js, heat-ui.js and tshelpers.js */
var generateHash = require('random-hash').generateHash
var LIBJS_HASHED_NAME = 'lib-'+generateHash()+'.js'
var HEATUIJS_HASHED_NAME = 'heat-ui-'+generateHash()+'.js'
var TSHELPERS_HASHED_NAME = 'tshelpers-'+generateHash()+'.js'
var LESS_HASHED_NAME = 'index-'+generateHash()+'.css'

var PATHS = {
  src: [
    'app/src/*.ts',
    'app/src/**/*.ts'
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
  ],
  config: [
    'app/known-servers-config.json'
  ]
};

gulp.task('default', function () {
  return gutil.log('Gulp is running')
});

/**
 * Parses app/index.html for build:js and build:css statements, moves
 * index.html to dist and creates:
 *  - charting-xxx.js
 *  - node_modules-xxx.js
 *  - material-xxx.css
 * Updates index.html script and style references.
 */
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

/**
 * Collects all scripts in lib folder and concatenates these to one big file.
 * Runs the minifier/uglifier over the generated code.
 * Renames lib.js to LIBJS_HASHED_NAME
 */
gulp.task('libjs',  function () {
  var concat = require('gulp-concat');
  var uglify = require('gulp-uglify');
  var sourcemaps = require('gulp-sourcemaps');
  return gulp.src(PATHS.libjs)
    .pipe(concat(LIBJS_HASHED_NAME))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(sourcemaps.write('../dist/maps'))
    .pipe(gulp.dest('dist'));
});

/**
 * Minifies and renames tshelpers to TSHELPERS_HASHED_NAME, moves that to dist
 */
gulp.task('tshelpers', function () {
  var concat = require('gulp-concat');
  var uglify = require('gulp-uglify');
  var sourcemaps = require('gulp-sourcemaps');
  return gulp.src(PATHS.tshelpers)
    .pipe(concat(TSHELPERS_HASHED_NAME))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(sourcemaps.write('../dist/maps'))
    .pipe(gulp.dest('dist'));
});

/**
 * Compiles all typescript and collects all in heat-ui.js which is then renamed to
 * a unque name defined in HEATUIJS_HASHED_NAME
 */
gulp.task('ts2js', function () {
  var typescript = require('gulp-typescript');
  var sourcemaps = require('gulp-sourcemaps');
  var uglify = require('gulp-uglify');
  var tscConfig = require('./tsconfig.json');
  var extend = require('util')._extend;
  return gulp.src(PATHS.src)
    .pipe(sourcemaps.init())
    .pipe(typescript(extend(tscConfig.compilerOptions, { outFile: HEATUIJS_HASHED_NAME })))
    .pipe(uglify())
    .pipe(sourcemaps.write('../dist/maps'))
    .pipe(gulp.dest('dist'));
});

gulp.task('less', function () {
  var rename = require("gulp-rename");
  var less = require('gulp-less');
  var plumber = require('gulp-plumber');
  var minifyCss = require('gulp-minify-css');
  return gulp.src('./app/styles/index.less')
    .pipe(plumber())
    .pipe(less({
      paths: [path.join(__dirname, 'less', 'includes')]
    }))
    .pipe(minifyCss())
    .pipe(rename(LESS_HASHED_NAME))
    .pipe(gulp.dest('./dist/styles/'));
});

/**
 * Updates the script refs in dist/index.html to use the hashed names for
 * lib.js, tshelpers.js and heat-ui.js.
 * Must run after those files have been created and renamed.
 */
gulp.task('updatescriptrefs', ['less', 'copy:dist', 'usemin', 'libjs', 'tshelpers', 'ts2js'], function () {
  var replace = require('gulp-replace');
  return gulp.src('dist/index.html')
    // .pipe(replace('<script src="node_modules-', '<script defer src="node_modules-'))
    // .pipe(replace('<script src="charting-', '<script defer src="charting-'))
    .pipe(replace('<script src="lib.js', '<script src="'+LIBJS_HASHED_NAME))
    .pipe(replace('<script src="heat-ui.js', '<script src="'+HEATUIJS_HASHED_NAME))
    .pipe(replace('<script src="tshelpers.js', '<script src="'+TSHELPERS_HASHED_NAME))
    .pipe(replace('<link rel="stylesheet" href="styles/index.css', '<link rel="stylesheet" href="styles/'+LESS_HASHED_NAME))
    .pipe(gulp.dest('dist'));
})

gulp.task('copy:dist', ['copy:assets','copy:dice_words','copy:loading','copy:html','copy:electron','copy:config'])

gulp.task('copy:assets', () => gulp.src(PATHS.assets).pipe(gulp.dest('dist/assets')))
gulp.task('copy:dice_words', () => gulp.src(PATHS.dice_words).pipe(gulp.dest('dist/dice-words')))
gulp.task('copy:loading', () => gulp.src(PATHS.loading).pipe(gulp.dest('dist/loading')))
gulp.task('copy:html', () => gulp.src(PATHS.html).pipe(gulp.dest('dist')))
gulp.task('copy:electron', () => gulp.src(PATHS.electron).pipe(gulp.dest('dist')))
gulp.task('copy:config', () => gulp.src(PATHS.config).pipe(gulp.dest('dist')))

gulp.task('play', ['build'], function () {
  var http = require('http');
  var connect = require('connect');
  var serveStatic = require('serve-static');
  //var open = require('open'); // open browser window
  //var path = require('path');

  var port, app;
  port = process.env.PORT || 9001;

  gulp.watch(PATHS.src.concat(PATHS.html, 'styles/**/*.less', 'styles/*.less'), ['ts2js', 'copy:dist', 'less']);

  app = connect().use(serveStatic(__dirname));
  http.createServer(app).listen(port, function () {
    //open('http://localhost:' + port + '/dist');
  });
});

gulp.task('build', ['updatescriptrefs']);

// gulp.task('electron', function () {
//   gulp.src('app/electron/*')
//     .pipe(gulp.dest('dist/electron'));
//   gulp.src(['app/node_modules/**/*'])
//     .pipe(gulp.dest('dist/node_modules'));
// });

// gulp.task('lint', function () {
//   return gulp.src('app/styles/**/*.less')
//     .pipe(lesshint({
//         // Options
//     }))
//     .pipe(lesshint.reporter())
//     .pipe(lesshint.failOnError());
// });
