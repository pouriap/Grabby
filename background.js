'use strict';

var DEBUG = true;

/**
 * a super duper global variable
 * @type {DlGrabApp}
 */
var app;

(async () => {

	let options = await loadOptions();
	app = new DlGrabApp(options);
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
		["responseHeaders", "blocking"]
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

	//store request details
	//when the response is received request and response details are used to create a Download obj
	let request = {};
	request.details = details;

	//put the request in allRequests so it can be accessed by it's requestId when response is received
	app.allRequests.put(details.requestId, request);

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
	let download = new Download(requestOfThisResponse.details, details);

	let filter = new ReqFilter(download);

	//the lists should be sorted from the least computationally intensive to the most

	//blacklists

	if(
		filter.isWebSocket() ||
		filter.isSizeBlocked() ||
		!filter.isStatusOK() ||
		filter.isAJAX()
	){
		return;
	}

	if(app.options.excludeWebFiles){
		if(
			filter.isImage() ||
			filter.isFont() ||
			filter.isTextual() ||
			filter.isOtherWebResource()
		){
			return;
		}
	}

	//todo: private browsing downloads are added to all downloads, maybe add a separate list for them
	//whitelists
	if(filter.hasAttachment()){
		download.grabReason = "attachment";
		app.addToAllDownloads(download);
	}
	else if(filter.isCompressed()){
		download.grabReason = "compressed"
		app.addToAllDownloads(download);
	}
	else if(filter.isDocument()){
		download.grabReason = "document"
		app.addToAllDownloads(download);
	}
	else if(filter.isOtherBinary()){
		download.grabReason = "binary"
		app.addToAllDownloads(download);
	}
	else if(filter.isMedia()){
		download.grabReason = "media"
		app.addToAllDownloads(download);
	}

	//now we're left with gray items
	//wtf do we do with gray items? :|
	else if(DEBUG){
		download.grabReason = 'graylist';
		download.debug_gray = 'debug_gray';
		app.addToAllDownloads(download);
	}
	//todo: mkv is considered media and not downloaded
	//todo: pdf is downloaded and not opened with browser
	if(app.options.overrideDlDialog || DEBUG){
		if(
			download.grabReason !== 'graylist'
			 && !filter.isMedia()
			// && !filter.isAJAX()
		){
			return new Promise(function(resolve){
				download.resolve = resolve;
				app.showDlDialog(download);
				console.log("download override: ", download);
			});
		}
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
	}
	else if(message.type === "clear_list"){
		app.allDownloads = new FixedSizeMap(app.options.dlListSize);
	}
	else if(message.type === "get_bg_data"){
		let data = {downloads: app.allDownloads, appJSON: app};
		return Promise.resolve(data);
	}
	else if(message.type === "dl_dialog_closing"){
		delete app.downloadDialogs[message.windowId];
		let downloadPageTabId = message.downloadPageTabId;
		browser.tabs.get(downloadPageTabId).then((tabInfo)=>{
			if(tabInfo.url === "about:blank"){
				console.log('closing tab: ', tabInfo);
				browser.tabs.remove(tabInfo.id);
			}
		});
	}
	else if(message.type === "continue_with_browser"){
		let download = app.allDownloads.get(message.downloadHash);
		if(download.resolve){
			download.resolve({cancel: false});
		}
	}
	else if(message.type === "intercept_download"){
		let download = app.allDownloads.get(message.downloadHash);
		if(download.resolve){
			download.resolve({cancel: true});
		}
	}

	return Promise.resolve();

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