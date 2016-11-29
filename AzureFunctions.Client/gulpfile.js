var gulp = require('gulp');
var sass = require('gulp-sass');
var inlineNg2Template = require('gulp-inline-ng2-template');

gulp.task('default', function() {
    gulp.src('styles/sass/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./styles/'))
});

gulp.task('inline', function() {
  var result = gulp.src('./app/**/*.ts')
  .pipe(inlineNg2Template({ base: '/' }));

  return result
    .pipe(gulp.dest('./app'));
});