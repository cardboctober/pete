var gulp = require('gulp');
var browserify = require('browserify');
var through2 = require('through2');
var concat = require('gulp-concat');

gulp.task('build', function() {
  return gulp.src('[0-9][0-9]/*.js')
    .pipe(through2.obj(function(file, enc, next) {
      browserify(file.path)
        .ignore('three')
        .bundle(function(err, res) {
          file.contents = res;
          next(null, file);
        });
    }))
    .pipe(gulp.dest('build/'));
});

gulp.task('vendors', function() {
  return gulp.src([
    'bower_components/es6-promise/promise.js',
    'bower_components/fulltilt/dist/fulltilt.js',
    'bower_components/threejs/build/three.js',
    'bower_components/webvr-polyfill/build/webvr-polyfill.js',
    'bower_components/lodash/lodash.js',
    'bower_components/threejs/examples/js/effects/StereoEffect.js',
    'bower_components/socket.io-client/socket.io.js',
    'bower_components/fastclick/lib/fastclick.js',
    'bower_components/orientationchange/orientationchange.js',
    'bower_components/fulltilt/dist/fulltilt.js',
    'bower_components/noisejs/index.js',
  ])
    .pipe(concat('vendors.js'))
    .pipe(gulp.dest('build/'));
});

gulp.task('watch', ['build'], function() {
  return gulp.watch(['[0-9][0-9]/app.js', 'lib/**/*.js'], ['build']);
});
