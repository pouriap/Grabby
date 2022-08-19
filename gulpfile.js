var { task, src, dest, series, parallel, watch } = require('gulp');
var ts = require('gulp-typescript');
var less = require('gulp-less');
var replace = require('gulp-replace');
var del = require('del');

task('copy-statics', function(){
	return src([
		'./src/icons/**/*',
		'./src/libs/**/*',
		'./src/**/*.jpg',
		'./src/**/*.png',
		'./src/**/*.gif',
		'./src/**/*.html',
	], {"base" : "./src"}).pipe(dest('dist'));
});

task('less', function(){
	return src('./src/**/*.less').pipe(less()).pipe(dest('dist'));
});

task('remove-debug', function(){
	return src(['./dist/**/*log.js'])
    	.pipe(replace('DEBUG = true', 'DEBUG = false'))
    	.pipe(dest('dist/'));
});

task('clean', function(){
	return del('dist/**', {force:true});
});

task('ts-debug', function(){
	var tsProject = ts.createProject("./tsconfig.json");
    return tsProject.src().pipe(tsProject())
		.on("error", () => {})
		.js.pipe(dest("dist"));
});

task('ts-prod', function(){
	var tsProject = ts.createProject("./tsconfig.json", {
		removeComments: true, 
	});
	return tsProject.src().pipe(tsProject())
		.on("error", () => {})
		.js.pipe(dest("dist"));
});

task('default', parallel('copy-statics', 'less', 'ts-debug'));

task('production', series('clean', parallel('copy-statics', 'less', 'ts-prod'), 'remove-debug'));

task('watch', function(){       
	watch('./src/**/*.less', series('less'));
	watch('./src/**/*.ts', series('ts-debug'));
	watch([
		'./src/icons/**/*',
		'./src/libs/**/*',
		'./src/**/*.jpg',
		'./src/**/*.png',
		'./src/**/*.gif',
		'./src/**/*.html',
	], series('copy-statics'));
});