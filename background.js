var allRequests = new FixedSizeMap(100);
var allDlItems = new FixedSizeMap(20);
var Utils = new Utils();


//TODO: check all API levels and see exactly what is the minimum version

browser.webRequest.onHeadersReceived.addListener(
	doOnHeadersReceived, {
		urls: ["*://*/*"]
	},
	["responseHeaders"]
);

browser.webRequest.onBeforeSendHeaders.addListener(
	doOnBeforeSendHeaders, {
		urls: ["*://*/*"]
	},
	["requestHeaders"]
);


function doOnBeforeSendHeaders(details){

	console.log(details.requestHeaders);

	let requestId = details.requestId;
	let url = details.url;
	let cookieHeader = Utils.getHeader(details.requestHeaders, "cookie");
	let cookies = (cookieHeader === undefined)? "" : cookieHeader.value;
	let refererHeader = Utils.getHeader(details.requestHeaders, "referer");
	let referer = (refererHeader === undefined)? "" : refererHeader;
	let time = Date.now();
	let dlItem = {
		url: url,
		cookies: cookies,
		referer: referer,
		time: time
	};

	console.log("sending: ", requestId);

	allRequests.put(requestId, dlItem);
}

function doOnHeadersReceived(details) {
	
	console.log("receiving: ", details.requestId);

	let requestId = details.requestId;
	let url = details.url;
	let requestOfThisResponse = allRequests.get(requestId);

	if(typeof requestOfThisResponse === 'undefined'){
		return;
	}

	let cookies = requestOfThisResponse.cookies;
	let referer = requestOfThisResponse.referer;
	let time = requestOfThisResponse.time;

	//remove asap to save memory
	allRequests.remove(requestId);

	//creating a new object because we deleted the original from allRequests
	let dlItem = {};
	dlItem.requestId = requestId;
	dlItem.url = url;
	dlItem.cookies = cookies;
	dlItem.referer = referer;
	dlItem.time = time;

	if (url.startsWith("ws://") || url.startsWith("wss://")) {
		return {};
	}

	let contentLengthHeader = Utils.getHeader(details.responseHeaders, "content-length");
	if (typeof contentLengthHeader !== 'undefined') {
		var fileSizeMB = contentLengthHeader.value / 1000000;
		if (fileSizeMB > 5) {
			dlItem.debug_reason = "content length: " + fileSizeMB.toFixed(1) + "MB";
			addToAllDlItems(dlItem);
		}
		return {};
	}

	let contentTypeHeader = Utils.getHeader(details.responseHeaders, "content-type");
	if (typeof contentTypeHeader !== 'undefined') {
		var contentType = contentTypeHeader.value;
		if (contentType.toLowerCase() == "application/octet-stream") {
			dlItem.debug_reason =  "content type:" + contentType;
			addToAllDlItems(dlItem);
		}
		return {};
	}

	let extensionsToNotDownload = ['jpg', 'jpeg', 'png', 'gif', 'css', 'js', 'html', 'htm', 'php', 'asp', 'jsp'];
	let extension = Utils.getExtensionFromURL(url);
	if (extension && !extensionsToNotDownload.includes(extension)) {
		dlItem.debug_reason =  "file extension: " + extension;
		addToAllDlItems(dlItem);
		return {};
	}

	console.log("ignoring url: ", url);
	return {};
}

function addToAllDlItems(dlItem){
	//we do this here because we don't want to hash the requests we will not add to dl list
	dlItem.hash = md5(dlItem.url);
	//we put hash of URL as key to prevent the same URL being added by different requests
	allDlItems.put(dlItem.hash, dlItem);
}


// Fixed size array class
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


// Download list class
function DownloadsList(size) {

	this.list = new FixedSizeMap(size);

	this.add = function (dlItem) {
		let exists = this.list.find((dlItem) => dlItem.url === dlItem.url);
		//don't add duplicates
		if (exists === undefined) {
			this.list.push(dlItem);
		}
	}
}

// A Util class of course
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

		if(!idmAvailable){
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
		let refererCode = (referer)? (",50=" + refere.length + ":" + referer) : "";

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