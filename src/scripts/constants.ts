const constants = 
{
	dateForamt : { hour: 'numeric', minute:'numeric', month: 'short', day:'numeric' },

	iconsUrl: '/icons/',

	webSocketProtos : ["ws://", "wss://"],
	webSocketTypes: ['websocket'],

	fileTypes: ['Audio', 'Binary', 'Compressed Archive', 'Document', 'Image', 'Video File', 'Text', 'Other'] as const,

	// These are things that are web resources such as images and css and we generally
	// do not want to grab them
	webResTypes: ['stylesheet', 'script', 'font', 'image', 'imageset'],
	webOtherTypes: [
		'xbl', 'xml_dtd', 'xslt', 'web_manifest', 
		'object', 'beacon', 'csp_report', 'object_subrequest', 'ping', 'speculative'
	],
	webResMimes: [
		'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/vnd.microsoft.icon', 
		'image/bmp', 'image/webp', 'image/tiff',
		'font/ttf', 'font/otf', 'application/vnd.ms-fontobject', 'font/woff', 'font/woff2', 
		'text/css', 'text/javascript', 'application/javascript',
	],
	webOtherMimes: [
		'text/html', 'application/xhtml+xml', 'application/json', 'application/ld+json', 
		'application/xml', 'text/xml', 'application/php', 
	],
	webResExts: [
		'jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'bmp', 'webp', 'tif', 'tiff',
		'ttf', 'otf', 'eot', 'woff2', 'woff',
		'css', 'js',
	],
	webOtherExts: [
		'html', 'htm', 'dhtml', 'xhtml', 'json', 'jsonld', 'xml', 'rss',
		'php', 'php3', 'php5', 'asp', 'aspx', 'jsp', 'jspx',
	],


	// Images
	imageExts: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'bmp', 'webp', 'tif', 'tiff'],
	imageMimes: [
		'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/vnd.microsoft.icon', 
		'image/bmp', 'image/webp', 'image/tiff',
	],
	imageTypes: ['image', 'imageset'],


	// Fonts
	fontExts: ['ttf', 'otf', 'eot', 'woff2', 'woff'],
	fontMimes: [
		'font/ttf', 'font/otf', 'application/vnd.ms-fontobject', 'font/woff', 'font/woff2', 
	],
	fontTypes: [
		'font'
	],


	// Texty things
	textualExts : [
		//static content
		'css', 'js', 'html', 'htm', 'dhtml', 'xhtml', 'json', 'jsonld', 'xml', 'rss',
		//dynamic pages
		'php', 'php3', 'php5', 'asp', 'aspx', 'jsp', 'jspx',
	],
	textualMimes : [
		//static content
		'text/css', 'text/javascript', 'application/javascript', 'text/html', 'application/xhtml+xml', 
		'application/json', 'application/ld+json', 'application/xml', 'text/xml',
		//dynamic pages
		'application/php', 
	],
	textualTypes: ['stylesheet', 'script', 'xbl', 'xml_dtd', 'xslt', 'web_manifest'],


	// Compresses things
	compressedExts: [
		'zip', 'gzip', 'gz', 'bz', 'bz2', '7z', 'tar', 'tgz', 'rar', 'jar', 'xpi', 'apk',
	],
	compressedMimes: [
		'application/x-compressed', 'application/x-zip-compressed', 'application/zip', 
		'application/x-gzip', 'application/x-bzip', 'application/x-bzip2', 'application/x-7z',
		'application/x-tar', 'application/gnutar', 	'application/x-rar-compressed',
	],


	// Video things
	videoExts: [
		'avi', 'flv', 'swf', 'wmv', 'mov', 'qt', 'ts', 'mp4', 'm4p', 'm4v', 'mkv', 'mpg', 'mpeg',
		'mp2', 'mpv', 'mpe', 'avchd', 'webm',
	],
	videoMimes: [
		'application/x-troff-msvideo', 'video/avi', 'video/msvideo', 'video/x-msvideo', 
		'application/x-shockwave-flash', 'video/quicktime', 'video/mp2t', 'video/mpeg', 
		'video/mp4', 'video/webm',
	],


	// Audio things
	audioExts: [
		'wav', 'wave', 'aiff', 'flac', 'alac', 'wma', 'mp3', 'ogg', 'aac', 'wma', 'weba',
	],
	audioMimes: [
		//audio
		'audio/wav', 'audio/aiff', 'audio/x-aiff', 'audio/flac', 'audio/mpeg', 'audio/mpeg3', 
		'audio/x-mpeg-3', 'audio/mp3', 'audio/ogg', 'audio/aac', 'audio/x-aac', 'audio/webm',
	],


	// Stream things
	hlsExts: [
		'm3u8',
	],
	hlsMimes: [
		'application/x-mpegurl', 'vnd.apple.mpegurl',
	],
	dashExts: [
		'mpd',
	],
	dashMimes: [
		'application/dash+xml', 'video/vnd.mpeg.dash.mpd',
	],


	// Document things
	documentExts : [
		//documents
		'doc', 'xls', 'ppt', 'docx', 'xlsx', 'pptx', 'pdf', 'epub', 'mobi', 'djvu', 'cbr',
	],
	documentMimes: [
		'application/msword', 'application/mspowerpoint', 'application/powerpoint', 
		'application/x-mspowerpoint','application/excel', 'application/x-excel', 'application/pdf',
	],


	// Binary things
	binaryExts: [
		//platform-specific
		'exe', 'msi', 'deb', 'rpm', 'pkg', 'dmg', 'app', 
		//other
		'bin', 'iso',
	],
	binaryMimes : [
		//other
		'application/octet-stream', 'application/binary',
	],


	// Audio and video that the browser decides is media
	mediaTypes : [
		'media'
	],

	// These are types as defined by Mozilla associated with web requests
	otherWebTypes: ['object', 'beacon', 'csp_report', 'object_subrequest', 'ping', 'speculative'],


	// AJAX obviously
	ajaxTypes: ['xmlhttprequest'],


	// Things that are displayable in the browser
	disPlayableExts: [
		'wav', 'wave', 'ogg', 'oga', 'ogv', 'ogx', 'spx', 'opus', 'webm', 'flac', 'mp3', 
		'mp4', 'm4a', 'm4p', 'm4b', 'm4r', 'm4v', 'txt', 'pdf'
	],
	disPlayableMimes: [
		'audio/wav', 'audio/ogg', 'video/ogg', 'audio/webm', 'video/webm', 'audio/flac', 
		'audio/mpeg', 'audio/mpeg3', 'audio/x-mpeg-3', 'audio/mp3', 'video/mp4', 
		'text/plain', 'application/pdf'
	],


	mimesToExts:
	{
		"audio/aac" : "aac",
		"audio/x-aac" : "aac",
		"application/x-abiword" : "abw",
		"application/x-freearc" : "arc",
		"video/x-msvideo" : "avi",
		"application/vnd.amazon.ebook" : "azw",
		"application/octet-stream" : "bin",
		"image/bmp" : "bmp",
		"application/x-bzip" : "bz",
		"application/x-bzip2" : "bz2",
		"application/x-csh" : "csh",
		"text/css" : "css",
		"text/csv" : "csv",
		"application/msword" : "doc",
		"application/mspowerpoint" : "pptx",
		"application/powerpoint" : "pptx",
		"application/x-mspowerpoint" : "pptx",
		"application/excel" : "xlsx",
		"application/x-excel" : "xlsx",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "xlsx",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "docx",
		"application/vnd.ms-fontobject" : "eot",
		"application/epub+zip" : "epub",
		"application/gzip" : "gz",
		"application/x-gzip" : "gz",
		"image/gif" : "gif",
		"text/html" : "html",
		"image/vnd.microsoft.icon" : "ico",
		"text/calendar" : "ics",
		"application/java-archive" : "jar",
		"image/jpeg" : "jpg",
		"text/javascript" : "js",
		"application/javascript" : "js",
		"application/json" : "json",
		"application/ld+json" : "jsonld",
		"audio/midi audio/x-midi" : "midi",
		"audio/mpeg" : "mp3",
		"audio/mpeg3" : "mp3",
		"audio/x-mpeg-3" : "mp3",
		"audio/mp3" : "mp3",
		"video/mpeg" : "mpeg",
		"video/mp4" : "mp4",
		"application/vnd.apple.installer+xml" : "mpkg",
		"application/vnd.oasis.opendocument.presentation" : "odp",
		"application/vnd.oasis.opendocument.spreadsheet" : "ods",
		"application/vnd.oasis.opendocument.text" : "odt",
		"audio/ogg" : "oga",
		"video/ogg" : "ogv",
		"application/ogg" : "ogx",
		"audio/opus" : "opus",
		"font/otf" : "otf",
		"image/png" : "png",
		"application/pdf" : "pdf",
		"application/php" : "php",
		"application/vnd.ms-powerpoint" : "ppt",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation" : "pptx",
		"application/vnd.rar" : "rar",
		"application/x-rar-compressed" : "rar",
		"application/rtf" : "rtf",
		"application/x-sh" : "sh",
		"image/svg+xml" : "svg",
		"application/x-shockwave-flash" : "swf",
		"video/quicktime" : "mov",
		"video/mp2t" : "ts",
		"application/x-tar" : "tar",
		"application/gnutar" : "tar",
		"image/tiff" : "tiff",
		"font/ttf" : "ttf",
		"text/plain" : "txt",
		"application/vnd.visio" : "vsd",
		"audio/wav" : "wav",
		"audio/aiff" : "aiff",
		"audio/x-aiff" : "aiff",
		"audio/webm" : "weba",
		"video/webm" : "webm",
		"application/x-troff-msvideo" : "avi",
		"video/avi" : "avi",
		"video/msvideo" : "avi",
		"image/webp" : "webp",
		"font/woff" : "woff",
		"font/woff2" : "woff2",
		"application/xhtml+xml" : "xhtml",
		"application/vnd.ms-excel" : "xls",
		"application/xml" : "xml",
		"text/xml" : "xml",
		"application/vnd.mozilla.xul+xml" : "xul",
		"application/zip" : "zip",
		"application/x-compressed" : "zip",
		"application/x-zip-compressed" : "zip",
		"video/3gpp" : "3gp",
		"audio/3gpp" : "3gp",
		"video/3gpp2" : "3g2",
		"audio/3gpp2" : "3g2",
		"application/x-7z" : "7z",
		"application/x-7z-compressed" : "7z"
	} as {[index:string]: string},


	extsToMimes: 
	{
		"aac" : ["audio/aac", "audio/x-aac"],
		"abw" : ["application/x-abiword"],
		"arc" : ["application/x-freearc"],
		"azw" : ["application/vnd.amazon.ebook"],
		"bin" : ["application/octet-stream"],
		"bmp" : ["image/bmp"],
		"bz" : ["application/x-bzip"],
		"bz2" : ["application/x-bzip2"],
		"csh" : ["application/x-csh"],
		"css" : ["text/css"],
		"csv" : ["text/csv"],
		"doc" : ["application/msword"],
		"ppt" : ["application/vnd.ms-powerpoint"],
		"pptx" : ["application/mspowerpoint", "application/powerpoint", "application/x-mspowerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
		"xlsx" : ["application/excel", "application/x-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
		"docx" : ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
		"eot" : ["application/vnd.ms-fontobject"],
		"epub" : ["application/epub+zip"],
		"gz" : ["application/gzip", "application/x-gzip"],
		"gif" : ["image/gif"],
		"html" : ["text/html"],
		"ico" : ["image/vnd.microsoft.icon"],
		"ics" : ["text/calendar"],
		"jar" : ["application/java-archive"],
		"jpg" : ["image/jpeg"],
		"js" : ["text/javascript", "application/javascript"],
		"json" : ["application/json"],
		"jsonld" : ["application/ld+json"],
		"midi" : ["audio/midi audio/x-midi"],
		"mjs" : ["text/javascript"],
		"mp3" : ["audio/mpeg", "audio/mpeg3", "audio/x-mpeg-3", "audio/mp3"],
		"mpeg" : ["video/mpeg"],
		"mp4" : ["video/mp4"],
		"mpkg" : ["application/vnd.apple.installer+xml"],
		"odp" : ["application/vnd.oasis.opendocument.presentation"],
		"ods" : ["application/vnd.oasis.opendocument.spreadsheet"],
		"odt" : ["application/vnd.oasis.opendocument.text"],
		"oga" : ["audio/ogg"],
		"ogv" : ["video/ogg"],
		"ogx" : ["application/ogg"],
		"opus" : ["audio/opus"],
		"otf" : ["font/otf"],
		"png" : ["image/png"],
		"pdf" : ["application/pdf"],
		"php" : ["application/php"],
		"rar" : ["application/vnd.rar", "application/x-rar-compressed"],
		"rtf" : ["application/rtf"],
		"sh" : ["application/x-sh"],
		"svg" : ["image/svg+xml"],
		"swf" : ["application/x-shockwave-flash"],
		"mov" : ["video/quicktime"],
		"ts" : ["video/mp2t"],
		"tar" : ["application/x-tar", "application/gnutar"],
		"tiff" : ["image/tiff"],
		"ttf" : ["font/ttf"],
		"txt" : ["text/plain"],
		"vsd" : ["application/vnd.visio"],
		"wav" : ["audio/wav"],
		"aiff" : ["audio/aiff",  "audio/x-aiff"],
		"weba" : ["audio/webm"],
		"webm" : ["video/webm"],
		"avi" : ["video/x-msvideo", "application/x-troff-msvideo", "video/avi", "video/msvideo"],
		"webp" : ["image/webp"],
		"woff" : ["font/woff"],
		"woff2" : ["font/woff2"],
		"xhtml" : ["application/xhtml+xml"],
		"xls" : ["application/vnd.ms-excel"],
		"xml" : ["application/xml", "text/xml"],
		"xul" : ["application/vnd.mozilla.xul+xml"],
		"zip" : ["application/zip", "application/x-compressed", "application/x-zip-compressed"],
		"3gp" : ["video/3gpp", "audio/3gpp"],
		"3g2" : ["video/3gpp2", "audio/3gpp2"],
		"7z" : ["application/x-7z", "application/x-7z-compressed"]
	} as {[index: string]: string[]},

}