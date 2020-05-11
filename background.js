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

	app.runtime.nativeCliId = 'download.grab.pouriap';
	app.runtime.menuParentId = 'download.grab.menu.parent';
	app.runtime.menuGrabAllId = 'download.grab.menu.graball';
	app.runtime.menuGrabSelectionId = 'download.grab.menu.grabselection';

	console.log('initializing app...');
	try{
		await app.initialize();
		console.log('app init successful');
		app.runtime.ready = true;
	}catch(e){
		console.log('app could not be initialized: ', e);
		app.runtime.ready = false;
		return;
	}

	//add parent menu item
	browser.menus.create({
		id: app.runtime.menuParentId,
		title: "Download Grab", 
		contexts: ["all"],
	});

	//add grab all menu
	browser.menus.create({
		id: app.runtime.menuGrabAllId,
		title: "Grab All",
		contexts: ["all"],
		parentId: app.runtime.menuParentId
	});

	//add grab selection menu
	browser.menus.create({
		id: app.runtime.menuGrabSelectionId,
		title: "Grab Selection",
		contexts: ["selection"],
		parentId: app.runtime.menuParentId
	});

	//menu click listener
	browser.menus.onClicked.addListener(doOnMenuClicked);
	browser.webRequest.onBeforeRequest.addListener(
		doOnBeforeRequest, {
			urls: ["*://*/*"]
		},
		["requestBody"]
	);

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
		[]
	);

	browser.runtime.onMessage.addListener(doOnMessage);

})();


/**
 * Runs every time a menu item is clicked
 * Links in selection are extracted using code by: https://github.com/c-yan/open-selected-links
 */
async function doOnMenuClicked(info, tab){

	let defaultDM = app.options.defaultDM || app.runtime.availableDMs[0];
	if(!defaultDM){
		//todo: show notification?
		console.log('no download managers are available');
		return;
	}

	if(info.menuItemId == app.runtime.menuGrabAllId){
		let result = await browser.tabs.executeScript({file: 'scripts/get_all_links.js'});
		downloadLinks(result[0]);
	}
	else if(info.menuItemId == app.runtime.menuGrabSelectionId){
		let result = await browser.tabs.executeScript({file: 'scripts/get_selection_links.js'});
		downloadLinks(result[0]);
	}

	function downloadLinks(result){
		let links = result.links;
		let originPageUrl = result.originPageUrl;
		let originPageDomain = result.originPageDomain;
		let originPageReferer = result.originPageReferer;
		NativeUtils.downloadMultiple(
			defaultDM,
			links,
			originPageUrl,
			originPageReferer,
			originPageDomain
		);
	}
}

/**
 * Runs before a request is sent
 * Is used to store POST data 
 */
function doOnBeforeRequest(details){

	let formDataArr = (details.method === "POST" && details.requestBody 
				&& details.requestBody.formData)? details.requestBody.formData : [];
	
	let postData = '';
	for(let key in formDataArr){
		let values = formDataArr[key];
		for(let value of values){
			postData = postData + `${key}=${value}&`;
		}
	}

	//remove last '&'
	postData = postData.slice(0, -1);

	//store post data in request object
	//more data are added to it in later stages of request
	let request = {};
	request.postData = postData;

	app.allRequests.put(details.requestId, request);
}

/**
 * Runs before a request is sent
 * Is used to store cookies, referer and other request info that is unavailable in reponse
 */
function doOnBeforeSendHeaders(details){
	//store request details
	let request = app.allRequests.get(details.requestId);
	request.details = details;
	request.details.postData = request.postData;
	delete request.postData;
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
		download.override = true;
		download.grabReason = "attachment";
		app.addToAllDownloads(download);
	}
	else if(filter.isCompressed()){
		download.override = true;
		download.grabReason = "compressed"
		app.addToAllDownloads(download);
	}
	else if(filter.isDocument()){
		download.override = true;
		download.grabReason = "document"
		app.addToAllDownloads(download);
	}
	else if(filter.isMedia()){
		//don't download playables that can be played inside browser
		//if we're here it means the download did not have an attachment header
		if(filter.isPlayableMedia()){
			download.override = false;
		}
		else{
			download.override = true;
		}
		download.grabReason = "media";
		app.addToAllDownloads(download);
	}
	else if(filter.isOtherBinary()){
		download.override = true;
		download.grabReason = "binary"
		app.addToAllDownloads(download);
	}

	//now we're left with gray items
	//wtf do we do with gray items? :|
	else if(DEBUG){
		download.grabReason = 'graylist';
		download.debug_gray = 'debug_gray';
		app.addToAllDownloads(download);
	}

	//show download dialog for downloads that should be overriden
	if(app.options.overrideDlDialog || DEBUG){
		if(download.override){
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
	//todo: try adding this to onResponseStarted
	app.allRequests.remove(details.requestId);
}


/**
 * Runs when a message is received from a script
 */
//todo:add messaging.js like native_utils.js
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
		if(message.continueWithBrowser){
			return;
		}
		let download = app.allDownloads.get(message.downloadHash);
		if(download.resolve){
			download.resolve({cancel: true});
		}
		//todo: new tabs that are not blank do not get closed: https://jdownloader.org/download/index
		//if we are not continuing with browser then close the empty tab
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
	//todo: unused
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