var gulp = require('gulp'); 
var ts = require('gulp-typescript');
var tsProject = ts.createProject("./tsconfig.json");
var less = require('gulp-less');

gulp.task('default', function(){
	gulp.src('./src/icons/**/*', { "base" : "./src" }).pipe(gulp.dest('dist'));
	gulp.src('./src/libs/**/*', { "base" : "./src" }).pipe(gulp.dest('dist'));
    gulp.src('./src/**/*.jpg').pipe(gulp.dest('dist'));
	gulp.src('./src/**/*.png').pipe(gulp.dest('dist'));
	gulp.src('./src/**/*.gif').pipe(gulp.dest('dist'));
	gulp.src('./src/**/*.html').pipe(gulp.dest('dist'));
    gulp.src('./src/**/*.less').pipe(less()).pipe(gulp.dest('dist'));    //do all less files
    return tsProject.src().pipe(tsProject())
	.on("error", () => { /* Ignore compiler errors */})
	.js.pipe(gulp.dest("dist"));    //do the typescript files
});
