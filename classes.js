//TODO: check all API levels and see exactly what is the minimum version
//todo: test with a redirect download
//todo: remove unused permissions
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
/*

/**
 * This is the main application class and holds all states
 * An instance of this is created in init.js as a global variable accessible 
 * to anyonw who has access to 'background.js' scope
 */
function DlAssistApp(options){

	this.options = options;

	// all requests made by Firefox are stored here temporarily until we get their response
	this.allRequests = new FixedSizeMap(100);

	// the last X downloadable items are stored here with their informations such as cookies,time,etc.
	this.allDlItems = new FixedSizeMap(options.dlListSize);

	// utility function
	this.Utils = new Utils();

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

}


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

	// first we look at content-length
	// if the file is big enough we consider it a download
	let contentLengthHeader = app.Utils.getHeader(details.responseHeaders, "content-length");
	if (typeof contentLengthHeader !== 'undefined') {
		var fileSizeMB = contentLengthHeader.value / 1000000;
		if (fileSizeMB > app.options.grabFilesBiggerThan) {
			dlItem.debug_reason = "content length: " + fileSizeMB.toFixed(1) + "MB";
			addToAllDlItems(dlItem);
		}
		return {};
	}

	// if content-lenght is not specified we look at content-type
	// if content-type is 'application/octet-stream' we consider it a download
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
	// we consider the file a download based on our inclusion/exclusion list
	//todo: options
	let extensionsToNotDownload = ['jpg', 'jpeg', 'png', 'gif', 'css', 'js', 'html', 'htm', 'php', 'asp', 'jsp'];
	let extension = app.Utils.getExtensionFromURL(url);
	if (extension && !extensionsToNotDownload.includes(extension)) {
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
 * A fixed sized map with key->value pairs
 * When size gets bigger than the limit first element is deleted and 
 * the new element is put in
 * Duplicate elements will rewrite the old ones
 */
function FixedSizeMap(size) {

	size = (Number(size));
	this.limit = isNaN(size)? 100 : size;
	this.list = {};

	this.getKeys = function(){
		return Object.keys(this.list);
	}

	this.getValues = function(){
		return Object.values(this.list);
	}

	this.getSize = function(){
		return this.getKeys().length;
	}

	this.remove = function(key){
		delete this.list[key];
	}

	this.put = function (key, value) {
		if (this.getSize() === this.limit) {
			let firstItemKey = this.getKeys()[0];
			this.remove(firstItemKey);
		}
		this.list[key] = value;
	}

	this.get = function(key){
		return this.list[key];
	}

}

//todo: make this static (object)
/**
 * A utility class of course!
 */
function Utils(){

	this.getHeader = function (headersArray, headerName){
		return headersArray.find(header => header.name.toLowerCase() === headerName);
	}

	this.getExtensionFromURL = function (url) {
		const regex = /\.([\w]*)($|\?)/gm;
		let match = regex.exec(url);
		if (match !== null) {
			return match[1];
		} 
		else {
			return "";
		}
	}

	this.getFilenameFromURL = function (url) {
		const regex = /\/([^\/\n\?\=]*)(\?|$)/gm;
		let match = regex.exec(url);
		if (match !== null) {
			return match[1];
		} 
		else {
			return "";
		}
	}

	this.downloadWithIDM = function (dlItem) {

		if(!app.runtime.idmAvailable){
			console.log("IDM is not available");
			return;
		}

		let msgBase = "MSG#1#14#1#0:1";

		let url = dlItem.url;
		let userAgent = navigator.userAgent;
		let cookies = dlItem.cookies;
		let referer = dlItem.referer;

		let urlCode = ",6=" + url.length + ":" + url;
		let userAgentCode = ",54=" + userAgent.length + ":" + userAgent;
		let cookiesCode = (cookies)? (",51=" + cookies.length + ":" + cookies) : "";
		let refererCode = (referer)? (",50=" + referer.length + ":" + referer) : "";

		let IDMMessage = msgBase + urlCode + userAgentCode + cookiesCode + refererCode + ";";

		let port = browser.runtime.connectNative("com.tonec.idm");
		port.postMessage(IDMMessage);
		port.disconnect();

	}
		
	this.downloadWithBrowser = function (url) {
		browser.downloads.download({
			saveAs: true,
			url: url
		});
	}

}