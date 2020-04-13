'use strict';

// a super duper global variable
var app;


(async () => {

	let options = await loadOptions();
	app = new DlGrabApp(options);
	// is used for developement
	app.debug = true;
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

	//create a request object and put necessary information in it
	let request = {};
	let requestId = details.requestId;
	request.origin = details.originUrl;
	request.headers = details.requestHeaders;
	request.details = details;

	//put the request in allRequests so it can be accessed by it's requestId when response is received
	app.allRequests.put(requestId, request);

}


/**
 * Runs once response headers are received 
 * We create a download here if the response matches our criteria and add it 
 * to our list of downloads
 */
function doOnHeadersReceived(details) {
	
	console.log("receiving: ", details);

	let requestId = details.requestId;
	let requestOfThisResponse = app.allRequests.get(requestId);
	
	if(typeof requestOfThisResponse === 'undefined'){
		return;
	}

	//creating a new download object because will delete the original from allRequests
	//in doOnCompleted() after the request is completed
	let origin = requestOfThisResponse.origin;
	let reqHeaders = requestOfThisResponse.headers;
	let resHeaders = details.responseHeaders;

	let download = new Download(details, origin, reqHeaders, resHeaders);

	download.res_details = details;
	download.req_details = requestOfThisResponse.details;

	let filter = new ReqFilter(download);

	//the lists should be sorted from the least computationally intensive to the most

	//blacklists
	if(
		filter.isTypeBlackListed() ||
		filter.isProtocoLBlackListed() ||
		filter.isSizeBlackListed() ||
		filter.isExtensionBlackListed() ||
		filter.isMimeBlackListed()
	){
		return;
	}

	//whitelists
	if(filter.hasAttachment()){
		download.debug_reason = "attachment";
		app.addToAllDownloads(download);
		return;
	}

	if(filter.isExtensionWhiteListed()){
		download.debug_reason = "extension: " + download.getFileExtension();
		app.addToAllDownloads(download);
		return;
	}

	if(filter.isMimeWhiteListed()){
		download.debug_reason = "mime: " + download.getContentType();
		app.addToAllDownloads(download);
		return;
	}

	//now we're left with gray items
	//wtf do we do with gray items? :|
	if(DEBUG){
		download.debug_reason = 'graylist';
		download.debug_gray = 'debug_gray';
		app.addToAllDownloads(download);
	}
	
}


/**
 * Runs once a request is completed
 */
function doOnCompleted(details){
	//remove the original download from allRequests to save memory
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
	else if(message.type === "clear_list"){
		app.allDownloads = new FixedSizeMap(app.options.dlListSize);
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
	app.allDownloads = new FixedSizeMap(options.dlListSize, app.allDownloads.list);

	console.log('saved options: ', app.options);
}