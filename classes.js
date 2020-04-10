//TODO: check all API levels and see exactly what is the minimum version
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


let excludedExtensions = [
	//images
	'jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'bmp', 'webp', 'tif', 'tiff',
	//fonts
	'ttf', 'otf', 'eot', 'woff2', 'woff',
	//static content
	'css', 'js', 'html', 'htm', 'dhtml', 'xhtml', 'json', 'jsonld', 'xml', 'rss', 'txt',
	//dynamic pages
	'php', 'php3', 'php5', 'asp', 'aspx', 'jsp', 'jspx',
	//certificates
	//'cer', 'cert', 'der', 'pem'
];

let excludedMimes = [
	//images
	'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/vnd.microsoft.icon', 'image/bmp', 'image/webp', 'image/tiff',
	//fonts
	'font/ttf', 'font/otf', 'application/vnd.ms-fontobject', 'font/woff', 'font/woff2', 
	//static content
	'text/css', 'text/javascript', 'application/javascript', 'text/html', 'application/xhtml+xml', 'application/json', 'application/ld+json', 'application/xml', 'text/xml', 'text/plain',
	//dynamic pages
	'application/php', 
]


/**
 * This is the main application class and holds all states
 * An instance of this is created in init.js as a global variable accessible
 * to anyonw who has access to 'background.js' scope
 */
class DlAssistApp {

	constructor(options) {
		this.options = options;
		// all requests made by Firefox are stored here temporarily until we get their response
		this.allRequests = new FixedSizeMap(100);
		// the last X downloadable items are stored here with their informations such as cookies,time,etc.
		this.allDlItems = new FixedSizeMap(options.dlListSize);
		// utility function
		this.runtime = {};
		this.runtime.idmAvailable = false;
	}

	/**
	 * this function returns a promise so that we can use 'await' on it
	 * it itself 'awaits' on sub-init functions and then resolves
	 */
	initialize() {

		var instance = this;
		return new Promise(async function (resolve) {
			console.log('initializing idm...');
			instance.runtime.idmAvailable = await initIDM();
			console.log('idm init finished');
			//resolve after all inits are completed
			resolve();
		});

		//this function returns a promis so that we can use 'await' on it
		function initIDM() {
			//todo: shayad init haii hast the addone IDM khodesh mikone ke ma kar mikonim
			// pas beddone addone idm emtehan konim
			return new Promise(function (resolve) {
				var initMessage = "MSG#2#6#2#2321:1:0:1294:704:-7:-7:1.25,117=37:Toolbox - Extension / Download Assist;";
				var port = browser.runtime.connectNative("com.tonec.idm");
				//this will only be called when IDM is available and reachable
				port.onMessage.addListener(function (m) {
					console.log('IDM is available');
					port.disconnect();
					resolve(true);
				});
				//this will only be called when the other end disconnects the connection
				//i.e. when IDM isn't available 
				port.onDisconnect.addListener((p) => {
					console.log("IDM is unavailable!");
					resolve(false);
				});
				console.log('sending idm init message...');
				port.postMessage(initMessage);
				//if IDM is available the onMessage() will disconnect port
				//if IDM is unavailable it will automatically disconnect port
				//but just for added safety we disconnect it in a timeout
				//if the promise is already resolved this will have no effect
				setTimeout(() => {
					port.disconnect();
					resolve(false);
				}, 500);
			});
		}

	};

}


class DlItem {

	/**
	 * Creates a new DlIem
	 * @param {int} requestId requestId in 'details'
	 * @param {string} url url of resource
	 * @param {string} origin page from which it was reqested
	 * @param {int} time time of request
	 * @param {string} filename name of the resource
	 * @param {array} reqHeaders 
	 * @param {array} resHeaders 
	 */
	constructor(requestId, url, origin, time, filename, reqHeaders, resHeaders){
		this.requestId = requestId;
		this.url = url;
		this.origin = origin;
		this.time = time;
		this.filename = filename;
		this.reqHeaders = reqHeaders;
		this.resHeaders = resHeaders;
	}

}


/**
 * A fixed sized map with key->value pairs
 * When size gets bigger than the limit first element is deleted and
 * the new element is put in
 * Duplicate elements will rewrite the old ones
 */
class FixedSizeMap {

	constructor(size, listData) {
		size = (Number(size));
		this.limit = isNaN(size) ? 100 : size;
		this.list = (listData) ? this._trimListData(listData, size) : {};
	}

	getKeys() {
		return Object.keys(this.list);
	};

	getValues() {
		return Object.values(this.list);
	};

	getSize() {
		return this.getKeys().length;
	};

	remove(key) {
		delete this.list[key];
	};

	put(key, value) {
		if (this.getSize() === this.limit) {
			let firstItemKey = this.getKeys()[0];
			this.remove(firstItemKey);
		}
		this.list[key] = value;
	};

	get(key) {
		return this.list[key];
	};

	_trimListData(listData, targetSize) {
		let keys = Object.keys(listData);
		let size = keys.length;
		if (targetSize < size) {
			let diff = size - targetSize;
			for (i = 0; i < diff; i++) {
				let k = keys[i];
				delete listData[k];
			}
		}
		return listData;
	}
	
}

/**
 * A utility class of course!
 */
class Utils {

	static getHeader(headersArray, headerName){
		return headersArray.find(header => header.name.toLowerCase() === headerName);
	}

	/**
	 * @param {array} headers
	 */
	static getHeaders(headers){

		//convert the stupid array to an object (map)
		let unStupidHeaders = {};
		for(let header of headers){
			let name = header.name.toLowerCase();
			let value = header.value;
			unStupidHeaders[name] = value;
		}

		return unStupidHeaders;
	}

	static getExtensionFromURL(url) {
		const regex = /\.([\w]*)($|\?)/gm;
		let match = regex.exec(url);
		if (match !== null) {
			return match[1];
		} 
		else {
			return "";
		}
	}

	static getFilenameFromURL(url) {
		const regex = /\/([^\/\n\?\=]*)(\?|$)/gm;
		let match = regex.exec(url);
		if (match !== null) {
			return match[1];
		} 
		else {
			return "";
		}
	}

}