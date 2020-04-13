'use strict';

//todo: move the lists somewhere eles
//todo: do we even need the image/font/css/script extension/mimes now that we have the type list?

var defaultOptions = {
	dlListSize: 20,
	grabFilesLargerThanMB: 0,
	excludeWebFiles : true,
	dateForamt : { hour: 'numeric', minute:'numeric', month: 'short', day:'numeric' },
	protocolBlackList : ["ws://", "wss://"],
	extensionBlackList : [
		//static content
		'html', 'htm', 'dhtml', 'xhtml', 'json', 'jsonld', 'xml', 'rss', 'txt',
		//dynamic pages
		'php', 'php3', 'php5', 'asp', 'aspx', 'jsp', 'jspx',
	],
	mimeBlackList : [
		//static content
		'text/html', 'application/xhtml+xml', 
		'application/json', 'application/ld+json', 'application/xml', 'text/xml', 'text/plain',
		//dynamic pages
		'application/php', 
	],
	extensionWhiteList : [
		//compressed 
		'zip', 'gzip', 'gz', 'bz', 'bz2', '7z', 'tar', 'tgz', 'rar', 'jar', 'xpi', 'apk',
		//platform-specific
		'exe', 'msi', 'deb', 'rpm', 'pkg', 'dmg', 'app', 
		//audio 
		'wav', 'aiff', 'flac', 'alac', 'wma', 'mp3', 'ogg', 'aac', 'wma',
		//video 
		'avi', 'flv', 'swf', 'wmv', 'mov', 'qt', 'ts', 'mp4', 'm4p', 'm4v', 'mkv', 'mpg', 'mpeg',
		'mp2', 'mpv', 'mpe', 'avchd',  
		//documents
		'doc', 'xls', 'ppt', 'docx', 'xlsx', 'pptx', 'pdf', 'epub', 'mobi', 'djvu', 'cbr',
		//other
		'bin', 'iso',
	],
	mimeWhiteList : [
		//other
		'application/octet-stream', 'application/binray',
		//compressed
		'application/x-compressed', 'application/x-zip-compressed', 'application/zip', 
		'application/x-gzip', 'application/x-bzip', 'application/x-bzip2', 'application/x-7z',
		'application/x-tar', 'application/gnutar', 	'application/x-rar-compressed',
		//audio
		'audio/wav', 'audio/aiff', 'audio/x-aiff', 'audio/mpeg', 'audio/mpeg3', 'audio/x-mpeg-3', 
		'audio/aac', 'audio/x-aac',
		//video
		'application/x-troff-msvideo', 'video/avi', 'video/msvideo', 'video/x-msvideo', 
		'application/x-shockwave-flash', 'video/quicktime', 'video/mp2t', 'video/mpeg',
		//documents
		'application/msword', 'application/mspowerpoint', 'application/powerpoint', 
		'application/x-mspowerpoint','application/excel', 'application/x-excel', 'application/pdf',
	],
	typeBlackList : [
		'xmlhttprequest', 
		'font', 'image', 'imageset', 'stylesheet', 'script', 
		'object', 'beacon', 'csp_report', 'object_subrequest', 'ping', 'speculative', 
		'web_manifest', 'websocket', 'xbl', 'xml_dtd', 'xslt',
	],
	typeWhiteList : [
		'media'
	]
}