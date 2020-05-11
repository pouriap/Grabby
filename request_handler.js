var RequestHandler = {

	/**
	 * @type {DlGrabApp}
	 */
	app: undefined,

	initialize: function(app){

		this.app = app;

		browser.webRequest.onBeforeRequest.addListener(
			this.doOnBeforeRequest, {
				urls: ["*://*/*"]
			},
			["requestBody"]
		);
	
		browser.webRequest.onBeforeSendHeaders.addListener(
			this.doOnBeforeSendHeaders, {
				urls: ["*://*/*"]
			},
			["requestHeaders"]
		);
	
		browser.webRequest.onHeadersReceived.addListener(
			this.doOnHeadersReceived, {
				urls: ["*://*/*"]
			},
			["responseHeaders", "blocking"]
		);
	
		browser.webRequest.onCompleted.addListener(
			this.doOnCompleted, {
				urls: ["*://*/*"]
			},
			[]
		);

	},

	/**
	 * Runs before a request is sent
	 * Is used to store POST data 
	 */
	doOnBeforeRequest: function(details){

		let _this = RequestHandler;

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

		_this.app.allRequests.put(details.requestId, request);
	},

	/**
	 * Runs before a request is sent
	 * Is used to store cookies, referer and other request info that is unavailable in reponse
	 */
	doOnBeforeSendHeaders: function(details){
		let _this = RequestHandler;
		//store request details
		let request = _this.app.allRequests.get(details.requestId);
		request.details = details;
		request.details.postData = request.postData;
		delete request.postData;
	},

	/**
	 * Runs once response headers are received 
	 * We create a download here if the response matches our criteria and add it 
	 * to our list of downloads
	 */
	doOnHeadersReceived: function(details) {

		let _this = RequestHandler;

		console.log("receiving: ", details);

		let requestId = details.requestId;
		let requestOfThisResponse = _this.app.allRequests.get(requestId);
		
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
			filter.isSizeBlocked(_this.app.options.grabFilesLargerThanMB) ||
			!filter.isStatusOK() ||
			filter.isAJAX()
		){
			return;
		}

		if(_this.app.options.excludeWebFiles){
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
			_this.app.addToAllDownloads(download);
		}
		else if(filter.isCompressed()){
			download.override = true;
			download.grabReason = "compressed"
			_this.app.addToAllDownloads(download);
		}
		else if(filter.isDocument()){
			download.override = true;
			download.grabReason = "document"
			_this.app.addToAllDownloads(download);
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
			_this.app.addToAllDownloads(download);
		}
		else if(filter.isOtherBinary()){
			download.override = true;
			download.grabReason = "binary"
			_this.app.addToAllDownloads(download);
		}

		//now we're left with gray items
		//wtf do we do with gray items? :|
		else if(DEBUG){
			download.grabReason = 'graylist';
			download.debug_gray = 'debug_gray';
			_this.app.addToAllDownloads(download);
		}

		//show download dialog for downloads that should be overriden
		if(_this.app.options.overrideDlDialog || DEBUG){
			if(download.override){
				return new Promise(function(resolve){
					download.resolve = resolve;
					_this.app.showDlDialog(download);
					console.log("download override: ", download);
				});
			}
		}
		
	},

	/**
	 * Runs once a request is completed
	 */
	doOnCompleted: function(details){
		let _this = RequestHandler;
		//remove the original download from allRequests to save memory
		//this isn't really necessary because allRequest is a fixed sized map
		//todo: try adding this to onResponseStarted
		_this.app.allRequests.remove(details.requestId);
	}

}