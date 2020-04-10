'use strict';

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
	let reqHeaders = requestOfThisResponse.headers;
	let resHeaders = details.responseHeaders;

	let dlItem = new DlItem(requestId, url, origin, time, reqHeaders, resHeaders);
	let filter = new ReqFilter(dlItem);

	if(
		filter.isProtocoLBlackListed() ||
		filter.isSizeBlackListed() ||
		filter.isExtensionBlackListed() ||
		filter.isMimeBlackListed()
	){
		return;
	}

	if(filter.isExtensionWhiteListed()){
		dlItem.debug_reason = "extension: " + dlItem.getFileExtension();
		addToAllDlItems(dlItem);
		return;
	}

	if(filter.isMimeWhiteListed()){
		dlItem.debug_reason = "mime: " + dlItem.getContentType();
		addToAllDlItems(dlItem);
		return;
	}

	//now we're left with gray items
	//wtf do we do with gray items? :|

	console.info("there's a gray item: ", dlItem);

	/**
	 * Adds a dlItem to our main list of downloads
	 * @param {DlItem} dlItem 
	 */
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