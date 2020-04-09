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
	let headers = app.Utils.getHeaders(details.requestHeaders);

	//create a dlItem object and put necessary information in it
	let dlItem = {};
	dlItem.origin = origin;
	dlItem.time = time;
	dlItem.headers = headers;

	//put the dlItem in allRequests so it can be accessed by it's requestId when response is received
	app.allRequests.put(requestId, dlItem);

	console.log("sending: ", requestId);
}


/**
 * Runs once response headers are received 
 * We create a dlItem here if the response matches our criteria and add it 
 * to our list of downloads
 */
function doOnHeadersReceived(details) {
	
	console.log("receiving: ", details.requestId);

	let requestId = details.requestId;
	let url = details.url;
	let requestOfThisResponse = app.allRequests.get(requestId);

	if(typeof requestOfThisResponse === 'undefined'){
		return;
	}

	//creating a new dlItem object because will delete the original from allRequests
	//in doOnCompleted() after the request is completed
	let dlItem = {};
	dlItem.requestId = requestId;
	dlItem.url = url;
	dlItem.origin = requestOfThisResponse.origin;
	dlItem.time = requestOfThisResponse.time;
	dlItem.headers = requestOfThisResponse.headers;

	//first we make sure the request is not among excluded things
	if(handleExclusions()){
		return {};
	}

	// then we look at content-length
	// if the file is big enough we consider it a download
	if(handleContentLength()){
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

	function handleExclusions(){
		//exclude all websocket requests
		if (url.startsWith("ws://") || url.startsWith("wss://")) {
			return true;
		}
		//we check if the file has an extension and if that extension is among excluded extensions
		let extension = app.Utils.getExtensionFromURL(url);
		if (extension && app.options.excludeWebFiles && excludedExtensions.includes(extension)) {
			return true;
		}
		return false;
	}

	function handleContentLength(){
		let contentLengthHeader = app.Utils.getHeader(details.responseHeaders, "content-length");
		if (typeof contentLengthHeader !== 'undefined') {
			var fileSizeMB = (contentLengthHeader.value / 1000000).toFixed(1);
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
		let contentTypeHeader = app.Utils.getHeader(details.responseHeaders, "content-type");
		if (typeof contentTypeHeader !== 'undefined') {
			var contentType = contentTypeHeader.value;
			if (contentType.toLowerCase() == "application/octet-stream") {
				dlItem.debug_reason =  "content type:" + contentType;
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

	function addToAllDlItems(dlItem){
		//we do this here because we don't want to run hash on requests we will not use
		dlItem.hash = md5(dlItem.url);
		//we put hash of URL as key to prevent the same URL being added by different requests
		app.allDlItems.put(dlItem.hash, dlItem);
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