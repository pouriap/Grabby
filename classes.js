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
*/


//todo: options
let excludedExtensions = [
	//images
	'jpg', 'jpeg', 'png', 'gif', 'svg', 'ico',
	//fonts
	'ttf', 'otf', 'eot', 'woff2', 'woff',
	//static content
	'css', 'js', 'html', 'htm', 'dhtml', 'xhtml', 'json', 'xml', 'rss',
	//dynamic pages
	'php', 'php3', 'php5', 'asp', 'aspx', 'jsp', 'jspx',
	//certificates
	//'cer', 'cert', 'der', 'pem'
];


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