var gulp = require('gulp');
var browserify = require('browserify');
var through2 = require('through2');

gulp.task('build', function() {
  gulp.src('[0-9][0-9]/*.js')
    .pipe(through2.obj(function(file, enc, next) {
      browserify(file.path)
        .ignore('three')
        .bundle(function(err, res) {
          file.contents = res;
          next(null, file);
        });
    }))
    .pipe(gulp.dest('./build/'));
});

gulp.task('watch', ['build'], function() {
  gulp.watch(['[0-9][0-9]/*.js', 'lib/**/*.js'], ['build']);
});
