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
	let cookieHeader = app.Utils.getHeader(details.requestHeaders, "cookie");
	let cookies = (cookieHeader === undefined)? "" : cookieHeader.value;
	let refererHeader = app.Utils.getHeader(details.requestHeaders, "referer");
	let referer = (refererHeader === undefined)? "" : refererHeader;
	let origin = details.originUrl;
	let time = details.timeStamp;

	//create a dlItem object and put necessary information in it
	let dlItem = {};
	dlItem.cookies = cookies;
	dlItem.referer = referer;
	dlItem.origin = origin;
	dlItem.time = time;

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
	dlItem.cookies = requestOfThisResponse.cookies;
	dlItem.referer = requestOfThisResponse.referer;
	dlItem.origin = requestOfThisResponse.origin;
	dlItem.time = requestOfThisResponse.time;

	if (url.startsWith("ws://") || url.startsWith("wss://")) {
		return {};
	}


	//first we check if the file has an extension and if that extension is among excluded extensions
	let extension = app.Utils.getExtensionFromURL(url);
	if (extension && app.options.excludeWebFiles && excludedExtensions.includes(extension)) {
		return {};
	}

	// then we look at content-length
	// if the file is big enough we consider it a download
	let contentLengthHeader = app.Utils.getHeader(details.responseHeaders, "content-length");
	if (typeof contentLengthHeader !== 'undefined') {
		var fileSizeMB = contentLengthHeader.value / 1000000;
		if (fileSizeMB > app.options.grabFilesBiggerThan) {
			dlItem.debug_reason = "content length: " + fileSizeMB.toFixed(1) + "MB";
			//todo: show size in desc 
			dlItem.sizeMB = fileSizeMB;
			addToAllDlItems(dlItem);
		}
		return {};
	}

	// if content-lenght is not specified we look at content-type
	// if content-type is 'application/octet-stream' we consider it a download
	//todo: vaghti mikhaim exclude nakonim va hameye faile ha ro download konim chi?
	let contentTypeHeader = app.Utils.getHeader(details.responseHeaders, "content-type");
	if (typeof contentTypeHeader !== 'undefined') {
		var contentType = contentTypeHeader.value;
		if (contentType.toLowerCase() == "application/octet-stream") {
			dlItem.debug_reason =  "content type:" + contentType;
			addToAllDlItems(dlItem);
		}
		return {};
	}

	// if contnet lenght and type are unavailable we look at the file extension
	// if the url contains a file extension we consider it a download
	// if we're here it means this extension is not excluded
	if (extension) {
		dlItem.debug_reason =  "file extension: " + extension;
		addToAllDlItems(dlItem);
		return {};
	}

	// if the response doesn't math any of our criteria then it is not a download and we ignore it
	console.log("ignoring url: ", url);
	return {};

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
		app.options = message.options;
		return Promise.resolve(app.options);
	}
	else if(message.type === "get_app"){
		return Promise.resolve(app);
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