'use strict';

//todo: store options in sync, what's wrong with me?
//todo: save downloads list
//todo: policies:
/*
- Add-ons must only request those permissions that are necessary for function
- Add-ons should avoid including duplicate or unnecessary files
- Add-on code must be written in a way that is reviewable and understandable. 
Reviewers may ask you to refactor parts of the code if it is not reviewable.
- You may include third-party libraries in your extension. In that case, when you upload 
your extension to AMO, you will need to provide links to the library source code.
- The add-on listing should have an easy-to-read description about everything it does, 
and any information it collects. Please consult our best practices guide for creating
 an appealing listing.
 - If the add-on uses native messaging, the privacy policy must clearly disclose which 
information is being exchanged with the native application. Data exchanged with the 
native application must be in accordance with our No Surprises policy.
*/
//todo: how firefox determines mime types:
//https://developer.mozilla.org/en-US/docs/Mozilla/How_Mozilla_determines_MIME_Types



/**
 * This is the main application class and holds all states
 * An instance of this is created in init.js as a global variable accessible
 * to anyonw who has access to 'background.js' scope
 */
class DlGrabApp {

	constructor(options) {
		this.options = options;
		// all requests made by Firefox are stored here temporarily until we get their response
		this.allRequests = new FixedSizeMap(100);
		// the last X downloadable items are stored here with their informations such as cookies,time,etc.
		this.allDownloads = new FixedSizeMap(options.dlListSize);
		// utility function
		this.runtime = {};
		this.runtime.idmAvailable = false;
		this.downloadDialogs = {};
	}

	/**
	 * this function returns a promise so that we can use 'await' on it
	 * it itself 'awaits' on sub-init functions and then resolves
	 */
	initialize() {

		var instance = this;
		return new Promise(async function (resolve) {
			console.log('initializing idm...');
			instance.runtime.idmAvailable = await initIDM();
			console.log('idm init finished');
			//resolve after all inits are completed
			resolve();
		});

		//this function returns a promise so that we can use 'await' on it
		function initIDM() {
			//todo: try without IDM addon being installed and see if it works
			return new Promise(function (resolve) {
				var initMessage = "MSG#2#6#2#2321:1:0:1294:704:-7:-7:1.25,117=37:Toolbox - Extension / Download Grab;";
				var port = browser.runtime.connectNative("com.tonec.idm");
				//this will only be called when IDM is available and reachable
				port.onMessage.addListener(function (m) {
					console.log('IDM is available');
					port.disconnect();
					resolve(true);
				});
				//this will only be called when the other end disconnects the connection
				//i.e. when IDM isn't available 
				port.onDisconnect.addListener((p) => {
					console.log("IDM is unavailable!");
					resolve(false);
				});
				console.log('sending idm init message...');
				port.postMessage(initMessage);
				//if IDM is available the onMessage() will disconnect port
				//if IDM is unavailable it will automatically disconnect port
				//but just for added safety we disconnect it in a timeout
				//if the promise is already resolved this will have no effect
				setTimeout(() => {
					port.disconnect();
					resolve(false);
				}, 500);
			});
		}

	}

	/**
	 * Adds a download to our main list of downloads
	 * @param {Download} download 
	 */
	addToAllDownloads(download){
		//we do this here because we don't want to run hash on requests we will not use
		let hash = download.getHash();
		//we put hash of URL as key to prevent the same URL being added by different requests
		this.allDownloads.put(hash, download);
	}

	/**
	 * opens the download dialog
	 * here's how things happen because WebExtensions suck ass:
	 * we open the download dialog window
	 * we store the windowId along with the associated download's hash in app.downloadDialogs
	 * after the dialog loads it sends a message to the background script requesting the download hash
	 * background script gives download dialogs the hash based on the windowId 
	 * download dialog gets the Download object from the hash and populates the dialog
	 * before the dialog is closed it sends a message to the background script telling it to delete the hash to free memory
	 */
	showDlDialog(dl) {

		var download = dl;
		let screenW = window.screen.width;
		let screenH = window.screen.height;
		let windowW = 350;
		let windowH = 450;
		let leftMargin = (screenW/2) - (windowW/2);
		let topMargin = (screenH/2) - (windowH/2);

		let createData = {
			type: "detached_panel",
			url: "popup/download.html",
			allowScriptsToClose : true,
			width: windowW,
			height: windowH,
			left: leftMargin,
			top: topMargin
		};
		let creating = browser.windows.create(createData);

		creating.then((windowInfo) => {
			let windowId = windowInfo.id;
			app.downloadDialogs[windowId] = download.getHash();
		});
	}

}


class Download {

	/**
	 * Creates a new Download object
	 * @param {object} reqDetails the 'details' object attached to a request
	 * @param {object} resDetails the 'details' object attached to a response
	 */
	constructor(reqDetails, resDetails){
		this.requestId = resDetails.requestId;
		this.url = resDetails.url;
		this.statusCode = resDetails.statusCode;
		this.time = resDetails.timeStamp;
		this.resourceType = resDetails.type;
		this.origin = reqDetails.originUrl || "N/A";
		this.reqDetails = reqDetails;
		this.resDetails = resDetails;
	}

	getHash(){
		if(typeof this.hash === 'undefined'){
			this.hash = md5(this.url);
		}
		return this.hash;
	}

	/**
	 * gets a header associated with this reqeust
	 * @param {string} headerName name of the header
	 * @param {string} headerDirection either "request" or "response"
	 */
	getHeader(headerName, headerDirection){

		let headers;
		if(headerDirection === 'request'){
			headers = this.reqDetails.requestHeaders;
		}
		else{
			headers = this.resDetails.responseHeaders;
		}

		let headerItem =  headers.find(function(header){
			return header.name.toLowerCase() === headerName.toLowerCase();
		});

		if(headerItem){
			return headerItem.value;
		}
		else{
			return undefined;
		}

	}

	/**
	 * get file name (if available) of the resouce requested
	 * @returns file name or "unknown" if now available
	 */
	getFilename(){

		if(typeof this.filename === "undefined"){

			this.filename = "unknown";

			//todo: add support for filename*=

			let disposition = this.getHeader('content-disposition', 'response');
			if(disposition){
				const regex = /filename=["']?(.*?)["']?(;|$)/im;
				let matches = disposition.match(regex);
				if(matches && matches[1]){
					this.filename = matches[1];
				}

			}
			//use URL if content-disposition didn't provide a file name
			if(this.filename === "unknown"){
				const regex = /\/([^\/\n\?\=]*)(\?|$)/;
				let url = decodeURI(this.url);
				let matches = url.match(regex);
				if(matches && matches[1]){
					this.filename = matches[1];
				}
			}
			//todo: create a mime<->extension mapping and give extension to files that don't have it
			//if the file has no extension give it a serial number
			//useful for urls like 'media.tenor.com/videos/9dd6603af0ac712c6a38dde9255746cd/mp4'
			//where lots of resources have the same path and hence the same filename
			if(this.filename !== "unknown" && this.filename.indexOf(".") === -1){
				this.filename = this.filename + "_" + this.requestId;
			}

		}

		return this.filename;
	}

	getHost(){

		if(typeof this.host === "undefined"){
			this.host = "unknown";
			let host = this.getHeader("host", "request");
			if(host){
				this.host = host;
			}
		}

		return this.host;
	}

	/**
	 * get content-length (if available) of the resource requested
	 * @returns size in MB or "unknown" if not available
	 */
	getSize(){

		if(typeof this.fileSize === "undefined"){

			this.fileSize = "unknown";

			let contentLength = this.getHeader("content-length", "response");
			let size = Number(contentLength);
			if(Number.isInteger(size)){
				this.fileSize = size;
			}
		}

		return this.fileSize;
	}

	/**
	 * gets the extension of the resource requested (if available)
	 * @returns the extension in lower case or "unknown" if no extension if available
	 */
	getFileExtension(){

		if(typeof this.fileExtension === "undefined"){

			this.fileExtension = "unknown";

			let filename = this.getFilename();
			let chuncks = filename.split('.');
			if(chuncks.length > 1){
				this.fileExtension = chuncks[chuncks.length-1].toLowerCase();
			}
		}

		return this.fileExtension;
	}

}


class ReqFilter {

	/**
	 * 
	 * @param {Download} download 
	 */
	constructor(download){
		this.download = download;
	}

	/* private funcitons */

	/**
	 * 
	 * @param {array} list 
	 */
	_isInProtocolList(list){
		for(let protocol of list){
			if(this.download.url.startsWith(protocol)){
				return true;
			}
		}
		return false;
	}

	/**
	 * 
	 * @param {array} list 
	 */
	_isInExtensionList(list){
		let extension = this.download.getFileExtension();
		if (extension !== "unknown" 
			&& list.includes(extension)) {
				return true;
		}
		return false;
	}

	/**
	 * 
	 * @param {array} list 
	 */
	_isInMimeList(list){
		let mime = this.download.getHeader("content-type", "response");
		if (mime){
			mime = mime.toLowerCase();
			for(let listMime of list){
				//we search for the mime's occurence in the content-type because sometimes 
				//content-type has other things in it as well
				if(mime.indexOf(listMime) !== -1){
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * 
	 * @param {array} list list of webRequest.ResourceTypes 
	 */
	_isInTypeList(list){
		return list.includes(this.download.resourceType);
	}

	
	/* public functions */

	isSizeBlocked(){
		let size = this.download.getSize();
		if(size === 0){
			return true;
		}
		return size !== 'unknown' && size < app.options.grabFilesLargerThanMB;
	}

	isWebSocket(){
		if(typeof this._isWebSocket === 'undefined'){
			this._isWebSocket = 
				this._isInTypeList(constants.webSocketTypes) ||
				this._isInProtocolList(constants.webSocketProtos);
		}
		return this._isWebSocket; 
	}

	isImage(){
		if(typeof this._isImage === 'undefined'){
			this._isImage = 
			this._isInTypeList(constants.imageTypes) ||
			this._isInExtensionList(constants.imageExts) ||
			this._isInMimeList(constants.imageMimes);
		}
		return this._isImage;
	}

	isFont(){
		if(typeof this._isFont === 'undefined'){
			this._isFont = 
				this._isInTypeList(constants.fontTypes) ||
				this._isInExtensionList(constants.fontExts) ||
				this._isInMimeList(constants.fontMimes);
		}
		return this._isFont;
	}

	isTextual(){
		if(typeof this._isTextual === 'undefined'){
			this._isTextual = 
				this._isInTypeList(constants.textualTypes) ||
				this._isInExtensionList(constants.textualExts) ||
				this._isInMimeList(constants.textualMimes);
		}
		return this._isTextual;
	}

	isOtherWebResource(){
		if(typeof this._isWebResource === 'undefined'){
			this._isWebSocket = this._isInTypeList(constants.otherWebTypes);
		}
		return this._isWebSocket;
	}

	isMedia(){
		if(typeof this._isMedia === 'undefined'){
			this._isMedia = 
				this._isInTypeList(constants.mediaTypes) ||
				this._isInExtensionList(constants.mediaExts) ||
				this._isInMimeList(constants.mediaMimes);
		}
		return this._isMedia;
	}

	isCompressed(){
		if(typeof this._isCompressed === 'undefined'){
			this._isCompressed = 
				this._isInExtensionList(constants.compressedExts) ||
				this._isInMimeList(constants.compressedMimes);
		}
		return this._isCompressed;
	}

	isDocument(){
		if(typeof this._isDocument === 'undefined'){
			this._isDocument = 
				this._isInExtensionList(constants.documentExts) ||
				this._isInMimeList(constants.documentMimes);
		}
		return this._isDocument;
	}

	isOtherBinary(){
		if(typeof this._isOtherBinary === 'undefined'){
			this._isOtherBinary = 
				this._isInExtensionList(constants.otherBinaryExts) ||
				this._isInMimeList(constants.otherBinaryMimes);
		}
		return this._isOtherBinary;
	}

	/**
	 * does this request have an "attachment" header?
	 */
	hasAttachment(){
		if(typeof this._hasAttachment === 'undefined'){
			let disposition = this.download.getHeader('content-disposition', 'response');
			this._hasAttachment = ( disposition && disposition.toLowerCase().indexOf("attachment") !== -1 );
		}
		return this._hasAttachment;
	}

	isAJAX(){
		if(typeof this._isAJAX === 'undefined'){
			this._isAJAX = this._isInTypeList(constants.ajaxTypes);
		}
		return this._isAJAX;
	}

	isStatusOK(){
		if(typeof this._isStatusOK === 'undefined'){
			this._isStatusOK = 
				//todo: some request get two responses, one with 206 and then a 200
				//example: the bookmarked download of firefox
				//as a result the download dialog will be shown twice 
				//for now we're only allowing 200 requests until further investigation
				(this.download.statusCode == 200)
				//|| (this.download.statusCode == 206);
		}
		return this._isStatusOK;
	}

	//todo: some of these don't really neeed lazy loading
	isFromCache(){
		if(typeof this._isFromCache === 'undefined'){
			this._isFromCache = 
				this.download.resDetails.fromCache;
		}
		return this._isFromCache;
	}

}


/**
 * A fixed sized map with key->value pairs
 * When size gets bigger than the limit, first element is deleted 
 * and the new element is put in
 * Duplicate elements will rewrite the old ones
 */
class FixedSizeMap {

	/**
	 * 
	 * @param {int} size 
	 * @param {object} listData (optional) the data to initialize this FixedSizeMap with
	 */
	constructor(size, listData) {
		size = (Number(size));
		this.limit = isNaN(size) ? 100 : size;
		this.list = (listData) ? this._trimListData(listData, size) : {};
	}

	getKeys() {
		return Object.keys(this.list);
	};

	getValues() {
		return Object.values(this.list);
	};

	getSize() {
		return this.getKeys().length;
	};

	remove(key) {
		delete this.list[key];
	};

	put(key, value) {
		if (this.getSize() === this.limit) {
			let firstItemKey = this.getKeys()[0];
			this.remove(firstItemKey);
		}
		this.list[key] = value;
	};

	get(key) {
		return this.list[key];
	};

	_trimListData(listData, targetSize) {
		let keys = Object.keys(listData);
		let size = keys.length;
		if (targetSize < size) {
			let diff = size - targetSize;
			for (i = 0; i < diff; i++) {
				let k = keys[i];
				delete listData[k];
			}
		}
		return listData;
	}
	
}

var constants = {
	dateForamt : { hour: 'numeric', minute:'numeric', month: 'short', day:'numeric' },


	webSocketProtos : ["ws://", "wss://"],
	webSocketTypes: ['websocket'],

	imageExts: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'bmp', 'webp', 'tif', 'tiff'],
	imageMimes: [
		'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/vnd.microsoft.icon', 
		'image/bmp', 'image/webp', 'image/tiff',
	],
	imageTypes: ['image', 'imageset'],


	fontExts: ['ttf', 'otf', 'eot', 'woff2', 'woff'],
	fontMimes: [
		'font/ttf', 'font/otf', 'application/vnd.ms-fontobject', 'font/woff', 'font/woff2', 
	],
	fontTypes: [
		'font'
	],


	textualExts : [
		//static content
		'css', 'js', 'html', 'htm', 'dhtml', 'xhtml', 'json', 'jsonld', 'xml', 'rss', 'txt',
		//dynamic pages
		'php', 'php3', 'php5', 'asp', 'aspx', 'jsp', 'jspx',
	],
	textualMimes : [
		//static content
		'text/css', 'text/javascript', 'application/javascript', 'text/html', 'application/xhtml+xml', 
		'application/json', 'application/ld+json', 'application/xml', 'text/xml', 'text/plain',
		//dynamic pages
		'application/php', 
	],
	textualTypes: ['stylesheet', 'script', 'xbl', 'xml_dtd', 'xslt', 'web_manifest'],


	otherWebTypes: ['object', 'beacon', 'csp_report', 'object_subrequest', 'ping', 'speculative'],


	ajaxTypes: ['xmlhttprequest'],


	compressedExts: [
		'zip', 'gzip', 'gz', 'bz', 'bz2', '7z', 'tar', 'tgz', 'rar', 'jar', 'xpi', 'apk',
	],
	compressedMimes: [
		'application/x-compressed', 'application/x-zip-compressed', 'application/zip', 
		'application/x-gzip', 'application/x-bzip', 'application/x-bzip2', 'application/x-7z',
		'application/x-tar', 'application/gnutar', 	'application/x-rar-compressed',
	],


	mediaExts: [
		//audio 
		'wav', 'aiff', 'flac', 'alac', 'wma', 'mp3', 'ogg', 'aac', 'wma', 'weba',
		//video 
		'avi', 'flv', 'swf', 'wmv', 'mov', 'qt', 'ts', 'mp4', 'm4p', 'm4v', 'mkv', 'mpg', 'mpeg',
		'mp2', 'mpv', 'mpe', 'avchd', 'webm',
	],
	mediaMimes: [
		//audio
		'audio/wav', 'audio/aiff', 'audio/x-aiff', 'audio/mpeg', 'audio/mpeg3', 'audio/x-mpeg-3', 
		'audio/aac', 'audio/x-aac', 'audio/mp3', 'audio/webm',
		//video
		'application/x-troff-msvideo', 'video/avi', 'video/msvideo', 'video/x-msvideo', 
		'application/x-shockwave-flash', 'video/quicktime', 'video/mp2t', 'video/mpeg', 
		'video/mp4', 'video/webm',
	],
	mediaTypes : [
		'media'
	],


	documentExts : [
		//documents
		'doc', 'xls', 'ppt', 'docx', 'xlsx', 'pptx', 'pdf', 'epub', 'mobi', 'djvu', 'cbr',
	],
	documentMimes: [
		'application/msword', 'application/mspowerpoint', 'application/powerpoint', 
		'application/x-mspowerpoint','application/excel', 'application/x-excel', 'application/pdf',
	],


	otherBinaryExts: [
		//platform-specific
		'exe', 'msi', 'deb', 'rpm', 'pkg', 'dmg', 'app', 
		//other
		'bin', 'iso',
	],
	otherBinaryMimes : [
		//other
		'application/octet-stream', 'application/binary',
	],


}