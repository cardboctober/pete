var gulp = require('gulp');
var webpack = require('webpack-stream');

gulp.task('build', function() {
  return gulp.src('app.js')
    .pipe(webpack({
      output: { filename: 'app.js' },
      stats: { warnings: false },
    }))
    .pipe(gulp.dest('build/'));
});

gulp.task('watch', ['build'], function() {
  return gulp.watch(['*.js'], ['build']);
});
