var DG = DG || {};

DG.RequestHandling = {

	/**
	 * 	
	 * @param {DlGrabApp} app 
	 */
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

		var _this = DG.RequestHandling;

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
		var _this = DG.RequestHandling;
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

		var _this = DG.RequestHandling;

		console.log("receiving: ", details);

		let requestId = details.requestId;
		let requestOfThisResponse = _this.app.allRequests.get(requestId);
		
		if(typeof requestOfThisResponse === 'undefined'){
			return;
		}

		//creating a new download object because will delete the original from allRequests
		//in doOnCompleted() after the request is completed
		let download = new Download(requestOfThisResponse.details, details);

		let filter = new ReqFilter(download, _this.app.options);

		let category = _getReqCategory(filter);

		if(category === ReqFilter.CAT_IGNORE){
			return;
		}

		//if it's not an IGNORE categoryo then we should add it to downloads list
		_this.app.addToAllDownloads(download);

		if(category === ReqFilter.CAT_FORCE_DL){
			let dmName = _this.app.options.defaultDM || _this.app.runtime.availableDMs[0];
			DG.NativeUtils.downloadSingle(dmName, download);
			return {cancel: true};
		}

		if(category === ReqFilter.CAT_GRAB && _this.app.options.overrideDlDialog){
			return new Promise(function(resolve){
				download.resolve = resolve;
				_this.app.showDlDialog(download);
				console.log("download override: ", download);
			});
		}


		/**
		 * Decides what to do with a certain request
		 * @param {ReqFilter} filter 
		 */
		function _getReqCategory(filter){

			//the lists should be sorted from the least computationally intensive to the most

			/****
			first we exclude things that are definitely not download even if they match some rules
			****/
			if(
				filter.isWebSocket() ||
				!filter.isStatusOK() ||
				filter.isAJAX()
			){
				return ReqFilter.CAT_IGNORE;
			}

			/****
			then we do things that user has explicitly specified in options
			****/
			//todo: we have options in ReqFilter now
			if(filter.isSizeBlocked()){
				return ReqFilter.CAT_IGNORE;
			}

			if(filter.isIncludedInOpts()){
				download.grabReason = 'opts-include';
				return ReqFilter.CAT_GRAB;
			}

			if(filter.isExcludedInOpts()){
				return ReqFilter.CAT_IGNORE;
			}

			if(filter.isForcedInOpts()){
				download.grabReason = 'opts-force';
				return ReqFilter.CAT_FORCE_DL;
			}

			if(_this.app.options.excludeWebFiles){
				if(
					filter.isImage() ||
					filter.isFont() ||
					filter.isTextual() ||
					filter.isOtherWebResource()
				){
					return ReqFilter.CAT_IGNORE;
				}
			}

			/****
			now we do things that the user has not specified but we think are downloads
			****/
			//has attachment should be first always
			if(filter.hasAttachment()){
				download.grabReason = "attachment";
				return ReqFilter.CAT_GRAB;
			}
			if(filter.isCompressed()){
				download.grabReason = "compressed"
				return ReqFilter.CAT_GRAB;
			}
			if(filter.isDocument()){
				download.grabReason = "document"
				return ReqFilter.CAT_GRAB;
			}
			if(filter.isMedia()){
				download.grabReason = "media";
				//don't download playables that can be played inside browser
				//if we're here it means the download did not have an attachment header
				if(filter.isPlayedInBrowser()){
					return ReqFilter.CAT_GRAB_NODIALOG;
				}
				else{
					return ReqFilter.CAT_GRAB;
				}
			}
			if(filter.isOtherBinary()){
				download.grabReason = "binary";
				return ReqFilter.CAT_GRAB;
			}

			//now we're left with gray items
			//todo: what do we do with gray items?
			if(DEBUG){
				download.grabReason = 'graylist';
				download.debug_gray = 'debug_gray';
				return ReqFilter.CAT_GRAB;
			}

		}
		
	},

	/**
	 * Runs once a request is completed
	 */
	doOnCompleted: function(details){
		let _this = DG.RequestHandling;
		//remove the original download from allRequests to save memory
		//this isn't really necessary because allRequest is a fixed sized map
		//todo: try adding this to onResponseStarted
		_this.app.allRequests.remove(details.requestId);
	}

}