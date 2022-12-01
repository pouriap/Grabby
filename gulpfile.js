var { task, src, dest, series, parallel, watch } = require('gulp');
var ts = require('gulp-typescript');
var less = require('gulp-less');
var replace = require('gulp-replace');
var del = require('del');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');

task('copy-statics', function(){
	return src([
		'./src/icons/**/*',
		'./src/libs/**/*',
		'./src/**/*.jpg',
		'./src/**/*.png',
		'./src/**/*.gif',
		'./src/**/*.html',
		'./src/**/manifest.json',
	], {"base" : "./src"}).pipe(dest('dist'));
});

task('copy-chrome-manifest', function(){
	return src(['./src/**/manifest-chrome.json'], {"base" : "./src"})
		.pipe(rename('manifest.json'))
		.pipe(dest('dist'));
});

task('less', function(){
	return src('./src/**/*.less').pipe(less()).pipe(dest('dist'));
});

task('remove-debug', function(){
	return src(['./dist/**/*log.js'])
    	.pipe(replace('DEBUG = true', 'DEBUG = false'))
    	.pipe(dest('dist/'));
});

task('default-debug-options', function(){
	return src(['./dist/**/*options.js'])
    	.pipe(replace('grabFilesLargerThanMB = 5', 'grabFilesLargerThanMB = 0'))
		.pipe(replace("ytdlProxy = ''", "ytdlProxy = 'socks5://localhost:9090'"))
    	.pipe(dest('dist/'));
});

task('remove-browser-dms', function(){
	return src(['./dist/**/*background.js'])
    	.pipe(replace('let browserDms = await BrowserDMs.getAvailableDMs()', 'let browserDms = []'))
    	.pipe(dest('dist/'));
});

task('clean', function(){
	return del('dist/**', {force:true});
});

task('ts-debug', function(){
	var tsProject = ts.createProject("./tsconfig.json");
    return tsProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject())
		.on("error", () => {})
		.js
		.pipe(sourcemaps.write())
		.pipe(dest("dist"));
});

task('ts-prod', function(){
	var tsProject = ts.createProject("./tsconfig.json", {
		removeComments: true, 
	});
	return tsProject.src().pipe(tsProject()).js.pipe(dest("dist"));
});

task('default', series(
	parallel('copy-statics', 'less', 'ts-debug'), 
	parallel('default-debug-options', 'remove-browser-dms')
));

task('chrome', series('default', 'copy-chrome-manifest'));

task('production', series(
	'clean', 
	parallel('copy-statics', 'less', 'ts-prod'), 
	'remove-debug'
));

task('production-chrome', series('production', 'copy-chrome-manifest'));


task('watch', function(){       
	watch('./src/**/*.less', series('less'));
	watch('./src/**/*.ts', series('ts-debug', parallel('default-debug-options', 'remove-browser-dms')));
	watch([
		'./src/icons/**/*',
		'./src/libs/**/*',
		'./src/**/*.jpg',
		'./src/**/*.png',
		'./src/**/*.gif',
		'./src/**/*.html',
		'./src/**/manifest.json',
	], series('copy-statics'));
});

task('watch-chrome', function(){       
	watch('./src/**/*.less', series('less'));
	watch('./src/**/*.ts', series('ts-debug', parallel('default-debug-options', 'remove-browser-dms')));
	watch([
		'./src/icons/**/*',
		'./src/libs/**/*',
		'./src/**/*.jpg',
		'./src/**/*.png',
		'./src/**/*.gif',
		'./src/**/*.html',
		'./src/**/*.json',
	], series('copy-statics', 'copy-chrome-manifest'));
});