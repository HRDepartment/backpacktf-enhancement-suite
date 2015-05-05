var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var header = require('gulp-header');

var userscript = require('fs').readFileSync('./suite.meta.js', 'utf8') + '\n';
gulp.task('default', function() {
    return browserify('./src/suite.js')
        .bundle()
        .pipe(source('suite.user.js'))
        .pipe(header(userscript))
        .pipe(gulp.dest('./'));
});
