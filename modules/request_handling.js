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

		//creating a new download object because the original will be deleted from allRequests
		//in doOnCompleted() after the request is completed or when app.allDownloads is full
		let download = new Download(requestOfThisResponse.details, details);

		let filter = new ReqFilter(download, _this.app.options);

		//if this request does not have an explicit action (user-specified in options)
		if(!_this.getExplicitAction(download, filter)){
			//first determine its category
			_this.determineCategory(download, filter);
			//then determine the action based on what category it is
			_this.determineAction(download, filter);
		}

		//perform said action
		return _this.performAction(download);
		
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
	},


	/**
	 * If the filter has an explicit action associated with it that ignores all rules
	 * then this function sets it
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 */
	getExplicitAction: function(download, filter){

		//ain't no downloads in these (hopefully)
		if(
			filter.isWebSocket() ||
			!filter.isStatusOK() ||
			filter.isAJAX()
		){
			download.act = ReqFilter.ACT_IGNORE;
			return true;
		}

		//todo: when we include a file, for example .js, then even web resource files of that
		//type are grabbed even if we have the option checked for not downloading web resources

		//most important is forced
		if(filter.isForcedInOpts()){
			download.grabReason = 'opts-force';
			download.act = ReqFilter.ACT_FORCE_DL;
			return true;
		}

		//then inclusions
		if(filter.isIncludedInOpts()){
			download.grabReason = 'opts-include';
			download.act = ReqFilter.ACT_GRAB;
			return true;
		}

		//then exclusions
		if(filter.isExcludedInOpts()){
			download.act = ReqFilter.ACT_IGNORE;
			return true;
		}

		//then size
		if(filter.isSizeBlocked()){
			download.act = ReqFilter.ACT_IGNORE;
			return true;		
		}

		return false;
	},


	/**
	 * Determines the category of a request
	 * Category is one of those defined in ReqFilter
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 */
	determineCategory: function(download, filter){

		/**
		 * use types to determine category first, because they are the most certain
		 */
		if(filter.isTypeWebRes()){
			download.cat = ReqFilter.CAT_WEBRES_API;
			return;
		}
		if(filter.isTypeMedia()){
			download.cat = ReqFilter.CAT_MEDIA_API;
			return;
		}
		if(filter.isTypeWebOther()){
			download.cat = ReqFilter.CAT_OTHERWEB_API;
			return;
		}

		/**
		 * then use mimes because mime is more certain than extension
		 */
		if(filter.isMimeWebRes()){
			download.cat = ReqFilter.CAT_WEB_RES;
			return;
		}
		if(filter.isMimeWebOther()){
			download.cat = ReqFilter.CAT_OTHER_WEB;
			return;
		}
		if(filter.isMimeMedia()){
			download.cat = ReqFilter.CAT_FILE_MEDIA;
			return;
		}
		if(filter.isMimeCompressed()){
			download.cat = ReqFilter.CAT_FILE_COMP;
			return;
		}
		if(filter.isMimeDocument()){
			download.cat = ReqFilter.CAT_FILE_DOC;
			return;
		}

		/**
		 * use extension to determine what category this request is
		 */
		if(filter.isExtWebRes()){
			download.cat = ReqFilter.CAT_WEB_RES;
			return;
		}
		if(filter.isExtWebOther()){
			download.cat = ReqFilter.CAT_OTHER_WEB;
			return;
		}
		if(filter.isExtMedia()){
			download.cat = ReqFilter.CAT_FILE_MEDIA;
			return;
		}
		if(filter.isExtCompressed()){
			download.cat = ReqFilter.CAT_FILE_COMP;
			return;
		}
		if(filter.isExtDocument()){
			download.cat = ReqFilter.CAT_FILE_DOC;
			return;
		}
		if(filter.isExtBinary()){
			download.cat = ReqFilter.CAT_FILE_BIN;
			return;
		}

		//this is 'application/octet-steam' and 'application/binary'
		//this is vague and the extension takes precedence to it so we put it at the end
		if(filter.isMimeGeneralBinary()){
			download.cat = ReqFilter.CAT_FILE_BIN;
			return;
		}

		download.cat = ReqFilter.CAT_UKNOWN;
		return;

	},

	
	/**
	 * Determines what action should be done about a request 
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 */
	determineAction: function(download, filter){

		var _this = DG.RequestHandling;

		if(download.cat === ReqFilter.CAT_WEBRES_API){
			if(_this.app.options.excludeWebFiles){
				download.act = ReqFilter.ACT_IGNORE;
			}
			else{
				download.grabReason = 'api web res not excluded';
				download.act = ReqFilter.ACT_GRAB_SILENT;
			}		
		}
		else if(download.cat === ReqFilter.CAT_OTHERWEB_API){
			download.act = ReqFilter.ACT_IGNORE;
		}
		else if(download.cat === ReqFilter.CAT_MEDIA_API){
			//should we show download dialog for these?
			download.grabReason = 'media type';
			download.act = ReqFilter.ACT_GRAB_SILENT;
		}

		//these aren't from API so we aren't so sure about them
		else if(download.cat === ReqFilter.CAT_OTHER_WEB){
			download.act = ReqFilter.ACT_IGNORE;
		}
		else if(filter.hasAttachment()){
			download.grabReason = 'attachment';
			download.act = ReqFilter.ACT_GRAB;
		}
		else if(download.cat === ReqFilter.CAT_WEB_RES){
			if(_this.app.options.excludeWebFiles){
				download.act = ReqFilter.ACT_IGNORE;
			}
			else{
				download.grabReason = 'web res not excluded'
				download.act = ReqFilter.ACT_GRAB_SILENT;
			}		
		}
		else if(
			download.cat === ReqFilter.CAT_FILE_MEDIA ||
			download.cat === ReqFilter.CAT_FILE_COMP ||
			download.cat === ReqFilter.CAT_FILE_DOC ||
			download.cat === ReqFilter.CAT_FILE_BIN
		){
			download.grabReason = 'known file type';
			download.act = ReqFilter.ACT_GRAB;
		}

		//as a last resort if the request does not have documentUrl or originUrl and 
		//has an extension then consider it a download
		//this should cover unknown file type downloads too
		else if
		(
			(!download.resDetails.documentUrl || !download.resDetails.originUrl) &&
			download.getFileExtension() !== 'unknown'
		){
			download.grabReason = 'has extension with no document/origin';
			download.act = ReqFilter.ACT_GRAB;
		}

		if(
			!filter.hasAttachment() &&
			filter.isDisplayedInBrowser() && 
			download.act === ReqFilter.ACT_GRAB
		){
			download.act = ReqFilter.ACT_GRAB_SILENT;
		}

	},


	/**
	 * Performs the action that is assigned to a request in determineAction()
	 * @param {Download} download 
	 */
	performAction: function(download){

		var _this = DG.RequestHandling;

		if(download.act === ReqFilter.ACT_IGNORE){
			return;
		}

		_this.app.addToAllDownloads(download);

		if(download.act === ReqFilter.ACT_GRAB_SILENT){
			browser.tabs.query({url: download.origin}).then((tabs)=>{
				let tabId = (tabs[0])? tabs[0].id : -1;
				if(tabId>1){
					browser.pageAction.show(tabId);
				}
			})
			return;
		}

		if(download.act === ReqFilter.ACT_FORCE_DL){
			let dmName = _this.app.options.defaultDM || _this.app.runtime.availableDMs[0];
			DG.NativeUtils.downloadSingle(dmName, download);
			return {cancel: true};
		}

		if(download.act === ReqFilter.ACT_GRAB && _this.app.options.overrideDlDialog){
			return new Promise(function(resolve){
				download.resolve = resolve;
				_this.app.showDlDialog(download);
			});
		}
		
	}

}