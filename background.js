// a super duper global variable
var app;

(async () => {

	let options = await loadOptions();
	app = new DlAssistApp(options);
	console.log('initializing app...');
	await app.initialize();
	console.log('app init finished');

	browser.webRequest.onBeforeSendHeaders.addListener(
		doOnBeforeSendHeaders, {
			urls: ["*://*/*"]
		},
		["requestHeaders"]
	);

	browser.webRequest.onHeadersReceived.addListener(
		doOnHeadersReceived, {
			urls: ["*://*/*"]
		},
		["responseHeaders"]
	);

	browser.webRequest.onCompleted.addListener(
		doOnCompleted, {
			urls: ["*://*/*"]
		},
		["responseHeaders"]
	);

	browser.runtime.onMessage.addListener(doOnMessage);

})();


/**
 * Runs before a request is sent
 * Is used to store cookies, referer and other request info that is unavailable in reponse
 */
function doOnBeforeSendHeaders(details){

	let requestId = details.requestId;
	let origin = details.originUrl;
	let time = details.timeStamp;
	let headers = Utils.getHeaders(details.requestHeaders);

	//create a dlItem object and put necessary information in it
	let request = {};
	request.origin = origin;
	request.time = time;
	request.headers = headers;

	//put the dlItem in allRequests so it can be accessed by it's requestId when response is received
	app.allRequests.put(requestId, request);

}


/**
 * Runs once response headers are received 
 * We create a dlItem here if the response matches our criteria and add it 
 * to our list of downloads
 */
function doOnHeadersReceived(details) {
	
	console.log("receiving: ", details);

	let requestId = details.requestId;
	let requestOfThisResponse = app.allRequests.get(requestId);

	
	if(typeof requestOfThisResponse === 'undefined'){
		return;
	}

	//creating a new dlItem object because will delete the original from allRequests
	//in doOnCompleted() after the request is completed
	let url = details.url;
	let origin = requestOfThisResponse.origin;
	let time = requestOfThisResponse.time;
	let filename = getFileName(url, details.responseHeaders);
	let reqHeaders = requestOfThisResponse.headers;
	let resHeaders = details.responseHeaders;
	let dlItem = new DlItem(requestId, url, origin, time, filename, reqHeaders, resHeaders);


	//first we make sure the request is not among excluded things
	if(handleProtocolExclusions()){
		return {};
	}

	if(handleContentTypeExclusions()){
		return {};
	}

	if(handleExtensionExclusions()){
		return {};
	}

	//handles should be sorted based on their certaintly
	//for example if a file's size is big we definitely want to add it so size is first
	//if it has an attachment we most certainly want to add it
	//but if it's content-type doesn't match our list of included types it doesn't necessary
	//mean we don't want it, so we put it later

	// then we look at content-length
	// if the file is big enough we consider it a download
	//todo: vaghti limit ro kam bezarim hame chiz ro donwload mikone chon faghat be size nega mikone
	if(handleContentLength()){
		return {};
	}

	//see if there is a "Content-Disposition: attachment" header available
	if(handleAttachment()){
		return {};
	}

	// if content-lenght is not specified we look at content-type
	// if content-type is 'application/octet-stream' we consider it a download
	//todo: vaghti mikhaim exclude nakonim va hameye faile ha ro download konim chi?
	//todo: add all content types like you added all extensions
	if(handleContentType()){
		return {};
	}

	// if contnet lenght and type are unavailable we look at the file extension
	// if the url contains a file extension we consider it a download
	// if we're here it means this extension is not excluded
	if(handleExtension()){
		return {};
	}

	// if the response doesn't math any of our criteria then it is not a download and we ignore it
	console.log("ignoring url: ", url);
	return {};

	function handleProtocolExclusions(){
		//exclude all websocket requests
		if (url.startsWith("ws://") || url.startsWith("wss://")) {
			return true;
		}
	}

	function handleContentTypeExclusions(){
		let contentTypeHeader = Utils.getHeader(details.responseHeaders, "content-type");
		if (typeof contentTypeHeader !== 'undefined') {
			let contentType = contentTypeHeader.value;
			for(let excludedType of excludedMimes){
				if(contentType.toLowerCase().indexOf(excludedType) != -1){
					return true;
				}
			}
		}
		return false;
	}

	function handleExtensionExclusions(){
		//we check if the file has an extension and if that extension is among excluded extensions
		let extension = Utils.getExtensionFromURL(url);
		if (extension && app.options.excludeWebFiles && excludedExtensions.includes(extension)) {
			return true;
		}
		return false;
	}

	function handleContentLength(){
		let contentLengthHeader = Utils.getHeader(details.responseHeaders, "content-length");
		if (typeof contentLengthHeader !== 'undefined') {
			let fileSizeMB = (contentLengthHeader.value / 1048576).toFixed(1);
			if (fileSizeMB > app.options.grabFilesBiggerThan) {
				dlItem.debug_reason = "content length: " + fileSizeMB + "MB";
				dlItem.sizeMB = fileSizeMB  + "MB";
				addToAllDlItems(dlItem);
			}
			return true;
		}
		return false;
	}

	function handleContentType(){
		let contentTypeHeader = Utils.getHeader(details.responseHeaders, "content-type");
		if (typeof contentTypeHeader !== 'undefined') {
			let contentType = contentTypeHeader.value;
			let typesToGrab = [
				"application/octet-stream",
				"application/gzip",
				"application/zip", 
				"application/x-tar",
				"application/x-7z",
				"application/x-bzip",
				"application/x-bzip2",
			];
			for(let type of typesToGrab){
				if(contentType.toLowerCase().indexOf(type) != -1){
					dlItem.debug_reason =  "content type:" + contentType;
					addToAllDlItems(dlItem);
					break;
				}
			}
			return true;
		}
		return false;
	}

	function handleAttachment(){
		let contentDispHeader = Utils.getHeader(details.responseHeaders, "content-disposition");
		if (typeof contentDispHeader !== 'undefined') {
			let contentDisp = contentDispHeader.value;
			if (contentDisp.toLowerCase().indexOf("attachment") != -1) {
				dlItem.debug_reason =  "attachment";
				addToAllDlItems(dlItem);
			}
			return true;
		}
		return false;
	}

	function handleExtension(){
		if (extension) {
			dlItem.debug_reason =  "file extension: " + extension;
			addToAllDlItems(dlItem);
			return {};
		}
	}	

	/**
	 * Adds a dlItem to our main list of downloads
	 * @param {FixedHashMap} dlItem 
	 */
	function addToAllDlItems(dlItem){
		//we do this here because we don't want to run hash on requests we will not use
		dlItem.hash = md5(dlItem.url);
		//we put hash of URL as key to prevent the same URL being added by different requests
		app.allDlItems.put(dlItem.hash, dlItem);
	}

	/**
	 * Tries to get the filename from either URL or from 
	 * 'content-disposition' header if it's available
	 * @param {string} url 
	 * @param {array} responseHeaders 
	 */
	function getFileName(url, responseHeaders){

		let contentDispHdr = Utils.getHeader(responseHeaders, 'content-disposition');
		if(contentDispHdr){
			let value = contentDispHdr.value;
			if(value.toLowerCase().indexOf("filename") != -1){
				const regex = /filename=["'](.*?)["']/i;
				let filename = value.match(regex)[1];
				if(filename){
					return filename;
				}
			}
		}
		else{
			const regex = /\/([^\/\n\?\=]*)(\?|$)/;
			let filename = url.match(regex)[1];
			if(filename){
				return filename;
			}
		}

		return "unknown_filename";
	}

}


/**
 * Runs once a request is completed
 */
function doOnCompleted(details){
	//remove the original dlItem from allRequests to save memory
	//this isn't really necessary because allRequest is a fixed sized map
	app.allRequests.remove(details.requestId);
}


/**
 * Runs when a message is received from a script
 */
function doOnMessage(message, sender, sendResponse) {

	console.log('message received:' + JSON.stringify(message));

	if(message.type === "options"){
		saveOptions(message.options);
		return Promise.resolve();
	}

}


function loadOptions(){

	let promise = new Promise(function(resolve){

		function doLoadOptions(loadedOptions) {
			console.log("loaded options: ", loadedOptions);
			resolve(loadedOptions);
		}
	
		function onError(error) {
			console.log(`Error getting options: ${error}`);
			resolve(defaultOptions);
		}
	
		let getting = browser.storage.local.get(defaultOptions);
		getting.then(doLoadOptions, onError);

	});

	return promise;
}

function saveOptions(options){
	//set optoins
	app.options = options;
	//create a new download list based on options
	app.allDlItems = new FixedSizeMap(options.dlListSize, app.allDlItems.list);

	console.log('saved options: ', app.options);
}