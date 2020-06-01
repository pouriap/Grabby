class RequestHandling {

	/**
	 * 	
	 * @param {DlGrabApp} app 
	 */
	constructor(app){
		this.app = app;
	}

	init(){

		browser.webRequest.onBeforeRequest.addListener(
			(details) => { return this.doOnBeforeRequest(details, this.app) }, 
			{urls: ["*://*/*"]},
			["requestBody"]
		);
	
		browser.webRequest.onBeforeSendHeaders.addListener(
			(details) => { return this.doOnBeforeSendHeaders(details, this.app) }, 
			{urls: ["*://*/*"]},
			["requestHeaders"]
		);
	
		browser.webRequest.onHeadersReceived.addListener(
			(details) => { return this.doOnHeadersReceived(details, this.app, this) }, 
			{urls: ["*://*/*"]},
			["responseHeaders", "blocking"]
		);
	
		browser.webRequest.onCompleted.addListener(
			(details) => { return this.doOnCompleted(details, this.app) }, 
			{urls: ["*://*/*"]},
			[]
		);

	}

	/**
	 * Runs before a request is sent
	 * Is used to store POST data 
	 */
	doOnBeforeRequest(details, app){

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
	doOnBeforeSendHeaders(details, app){
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
	 * @param {object} details 
	 * @param {DlGrabApp} app 
	 * @param {RequestHandling} _this 
	 */
	doOnHeadersReceived(details, app, _this) {

		console.log("receiving: ", details);

		let requestId = details.requestId;
		let requestOfThisResponse = app.allRequests.get(requestId);
		
		if(typeof requestOfThisResponse === 'undefined'){
			return;
		}

		//creating a new download object because the original will be deleted from allRequests
		//in doOnCompleted() after the request is completed or when app.allDownloads is full
		let download = new Download(requestOfThisResponse.details, details);

		let filter = new ReqFilter(download, app.options);

		//if this request does not have an explicit action (user-specified in options)
		if(!_this.getExplicitAction(download, filter, app)){
			//first determine its category
			_this.determineCategory(download, filter);
			//then determine the action based on what category it is
			_this.determineAction(download, filter, app);
		}

		//perform said action
		return _this.performAction(download, app);
		
	}

	/**
	 * Runs once a request is completed
	 */
	doOnCompleted(details, app){
		//remove the original download from allRequests to save memory
		//this isn't really necessary because allRequest is a fixed sized map
		//todo: try adding this to onResponseStarted
		app.allRequests.remove(details.requestId);
	}


	/**
	 * If the filter has an explicit action associated with it that ignores all rules
	 * then this function sets it
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 */
	getExplicitAction(download, filter, app){

		//ain't no downloads in these (hopefully)
		if(
			filter.isWebSocket() ||
			!filter.isStatusOK() ||
			filter.isAJAX() ||
			//todo: fix this madness
			filter.isBlackListed(app.runtime.blacklist)
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
	}


	/**
	 * Determines the category of a request
	 * Category is one of those defined in ReqFilter
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 */
	determineCategory(download, filter){

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

	}

	/**
	 * Determines what action should be done about a request 
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 * @param {DlGrabApp} app 
	 */
	determineAction(download, filter, app){

		if(download.cat === ReqFilter.CAT_WEBRES_API){
			if(app.options.excludeWebFiles){
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
			if(app.options.excludeWebFiles){
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

	}


	/**
	 * Performs the action that is assigned to a request in determineAction()
	 * @param {Download} download 
	 * @param {DlGrabApp} app 
	 */
	performAction(download, app){

		if(download.act === ReqFilter.ACT_IGNORE){
			return;
		}

		app.addToAllDownloads(download);

		if(download.act === ReqFilter.ACT_FORCE_DL){
			let dmName = app.options.defaultDM || app.runtime.availableDMs[0];
			NativeUtils.downloadSingle(dmName, download);
			return {cancel: true};
		}

		if(download.act === ReqFilter.ACT_GRAB && app.options.overrideDlDialog){
			//the request will be paused until this promise is resolved
			return new Promise(function(resolve){
				download.resolve = resolve;
				app.showDlDialog(download);
			});
		}
		
	}

}