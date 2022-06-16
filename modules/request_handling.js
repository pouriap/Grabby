class RequestHandling 
{
	static init()
	{
		browser.webRequest.onBeforeRequest.addListener(
			(details) => { return RequestHandling.doOnBeforeRequest(details) }, 
			{urls: ["*://*/*"]},
			["requestBody"]
		);
	
		browser.webRequest.onBeforeSendHeaders.addListener(
			(details) => { return RequestHandling.doOnBeforeSendHeaders(details) }, 
			{urls: ["*://*/*"]},
			["requestHeaders"]
		);
	
		browser.webRequest.onHeadersReceived.addListener(
			(details) => { return RequestHandling.doOnHeadersReceived(details) }, 
			{urls: ["*://*/*"]},
			["responseHeaders", "blocking"]
		);
	
		browser.webRequest.onCompleted.addListener(
			(details) => { return RequestHandling.doOnCompleted(details) }, 
			{urls: ["*://*/*"]},
			[]
		);

	}

	/**
	 * Runs before a request is sent
	 * Is used to store POST data 
	 */
	static doOnBeforeRequest(details)
	{
		let formDataArr = (
			details.method === "POST" && 
			details.requestBody &&
			details.requestBody.formData)? 
				details.requestBody.formData : [];
		
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

		DLG.allRequests.put(details.requestId, request);
	}

	/**
	 * Runs before a request is sent
	 * Is used to store cookies, referer and other request info that is unavailable in reponse
	 */
	static doOnBeforeSendHeaders(details)
	{
		//store request details
		let request = DLG.allRequests.get(details.requestId);
		request.details = details;
		request.details.postData = request.postData;
		delete request.postData;
	}

	/**
	 * Runs once response headers are received 
	 * We create a download here if the response matches our criteria and add it 
	 * to our list of downloads
	 * @param {object} details 
	 */
	static doOnHeadersReceived(details)
	{

		//log("receiving: ", details);

		//console.time(details.requestId);

		let requestId = details.requestId;
		let requestOfThisResponse = DLG.allRequests.get(requestId);
		
		if(typeof requestOfThisResponse === 'undefined'){
			return;
		}

		//creating a new download object because the original will be deleted from allRequests
		//in doOnCompleted() after the request is completed or when DLG.allDownloads is full
		let download = new Download(requestOfThisResponse.details, details);

		let filter = new ReqFilter(download, DLG.options);

		// Streams are different than normal downloads so we handle them here first
		// The thing is we need to figure out if the manifest is a playlist or is for a sinle video
		// We only want to send the main playlist manifest to ytdl
		// So we have to wait until the response is completed, then parse it and figure if it's a playlist
		// We can't do that using our normal download detection flow because it is synchronous 
		// Waiting for the response body is not synchronous
		if(filter.isStreamManifest() && !filter.isDLGRequest())
		{
			download.act = ReqFilter.ACT_IGNORE;

			let f = browser.webRequest.filterResponseData(details.requestId);
			let decoder = new TextDecoder("utf-8");
			let response = "";

			f.ondata = (event) => {
				response += decoder.decode(event.data, {stream: true});
				f.write(event.data);
			}
		  
			f.onstop = (event) => {
				f.disconnect();
				RequestHandling.handleStream(filter, response);
			}
		}

		// This is for normal downloads
		else if(!RequestHandling.isIgnored(download, filter))
		{
			//first determine its category
			RequestHandling.determineCategory(download, filter);
			//then group similar categories together into a class
			RequestHandling.determineClass(download, filter);
			//then determine the action based on what class the request is
			RequestHandling.determineAction(download, filter);
		}

		//perform said action
		return RequestHandling.performAction(download);
		
	}

	/**
	 * Runs once a request is completed
	 */
	static doOnCompleted(details)
	{
		//remove the original download from allRequests to save memory
		//this isn't really necessary because allRequest is a fixed sized map
		//todo: try adding this to onResponseStarted
		DLG.allRequests.remove(details.requestId);
	}


	/**
	 * If the filter has an explicit action associated with it that ignores all rules
	 * then this function sets it
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 */
	static isIgnored(download, filter)
	{
		//ain't no downloads in these (hopefully :)
		if(
			filter.isWebSocket() ||
			!filter.isStatusOK() ||
			//todo: fix this madness
			filter.isBlackListed(DLG.blacklist)
		){
			download.act = ReqFilter.ACT_IGNORE;
			return true;
		}

		//we don't want to do grab our own requests
		if(filter.isDLGRequest()){
			download.act = ReqFilter.ACT_IGNORE;
			return true;
		}

		//the only AJAX we're interested in is stream manifests
		if(filter.isAJAX() && !filter.isStreamManifest() ){
			download.act = ReqFilter.ACT_IGNORE;
			return true;
		}

		if(filter.isExcludedInOpts()){
			download.act = ReqFilter.ACT_IGNORE;
			return true;
		}

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
	static determineCategory(download, filter)
	{
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
		 * then use mimes because mime is more certain than extension except binary mimes
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
	 */
	static determineClass(download, filter)
	{
		if(download.cat === ReqFilter.CAT_WEBRES_API){
			download.classReason = 'web res api';
			download.class = ReqFilter.CLS_INLINE_WEB_RES;
		}
		else if(download.cat === ReqFilter.CAT_OTHERWEB_API){
			download.classReason = 'other web api';
			download.class = ReqFilter.CLS_WEB_OTHER;
		}
		else if(download.cat === ReqFilter.CAT_MEDIA_API){
			download.classReason = 'media api';
			download.class = ReqFilter.CLS_INLINE_MEDIA;
		}

		//these aren't from API so we aren't so sure about them
		else if(download.cat === ReqFilter.CAT_OTHER_WEB){
			download.classReason = 'other web';
			download.class = ReqFilter.CLS_WEB_OTHER;
		}
		else if(filter.hasAttachment()){
			download.classReason = 'attachment';
			download.class = ReqFilter.CLS_DOWNLOAD;
		}
		else if(download.cat === ReqFilter.CAT_WEB_RES){
			download.classReason = 'web res';
			download.class = ReqFilter.CLS_INLINE_WEB_RES;
		}
		else if(
			download.cat === ReqFilter.CAT_FILE_MEDIA ||
			download.cat === ReqFilter.CAT_FILE_COMP ||
			download.cat === ReqFilter.CAT_FILE_DOC ||
			download.cat === ReqFilter.CAT_FILE_BIN
		){
			download.classReason = 'known file type';
			download.class = ReqFilter.CLS_DOWNLOAD;
		}

		//as a last resort if the request does not have documentUrl or originUrl and 
		//has an extension then consider it a download
		//this should cover unknown file type downloads too
		else if
		(
			(!download.resDetails.documentUrl || !download.resDetails.originUrl) &&
			download.getFileExtension() !== 'unknown'
		){
			download.classReason = 'extension with no document/origin'
			download.class = ReqFilter.CLS_DOWNLOAD;
		}

	}

	/**
	 * Determines what action should be done about a request 
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 */
	static determineAction(download, filter)
	{
		if(download.class === ReqFilter.CLS_WEB_OTHER){
			download.act = ReqFilter.ACT_IGNORE;
		}

		if(download.class === ReqFilter.CLS_INLINE_WEB_RES){
			if(DLG.options.excludeWebFiles){
				download.act = ReqFilter.ACT_IGNORE;
			}
			else{
				download.act = ReqFilter.ACT_GRAB_SILENT;
			}
		}

		else if(download.class === ReqFilter.CLS_INLINE_MEDIA){
			download.act = ReqFilter.ACT_GRAB_SILENT;
		}

		else if(download.class === ReqFilter.CLS_DOWNLOAD){
			if( !filter.hasAttachment() && filter.isDisplayedInBrowser() ){
				download.act = ReqFilter.ACT_GRAB_SILENT;
			}
			else{
				download.act = ReqFilter.ACT_GRAB;
			}
		}

		//overrides
		if(download.class === ReqFilter.CLS_DOWNLOAD && filter.isForcedInOpts()){
			download.classReason = 'opts-force';
			download.act = ReqFilter.ACT_FORCE_DL;
			return true;
		}

		if(download.class === ReqFilter.CLS_DOWNLOAD && filter.isIncludedInOpts()){
			download.classReason = 'opts-include';
			download.act = ReqFilter.ACT_GRAB;
			return true;
		}

	}


	/**
	 * Performs the action that is assigned to a request in determineAction()
	 * @param {Download} download 
	 */
	static performAction(download)
	{
		//console.timeEnd(download.reqDetails.requestId);

		if(download.act === ReqFilter.ACT_IGNORE){
			return;
		}

		//todo: if a file is generated with a different URL each time we open a page
		//then consequent openings of that page adds the same file to the download list
		//example: https://tporn.xxx/en/video/10035255/eben18-ich-wollte-unbedingt-mal-mit-einem-groben-schwanz-bumsen/
		//warning: example is porn

		DLG.addToAllDownloads(download);

		if(download.act === ReqFilter.ACT_FORCE_DL){
			let dmName = Options.getDefaultDM();
			DownloadJob.getFromDownload(dmName, download).then((job)=>{
				Utils.performJob(job);
			});
			return {cancel: true};
		}

		if(download.act === ReqFilter.ACT_GRAB && DLG.options.overrideDlDialog){
			//the request will be paused until this promise is resolved
			return new Promise(function(resolve){
				download.resolve = resolve;
				DLG.showDlDialog(download);
			});
		}
		
	}

	/**
	 * 
	 * @param {ReqFilter} filter 
	 * @param {string} manifest 
	 */
	static handleStream(filter, manifest)
	{
		let parsedManifest = {};
		let tabId = filter.download.tabId.toString();
		let sendToYTDL = false;

		if(!DLG.tabs[tabId]){
			DLG.tabs[tabId] = {};
		}

		if(filter.isHlsManifest())
		{
			parsedManifest = Utils.praseHLS(manifest);

			filter.download.dlgmanifests = [];

			if(parsedManifest.playlists && parsedManifest.playlists.length > 0)
			{
				var numManifests = parsedManifest.playlists.length;

				for(let format of parsedManifest.playlists)
				{
					let url = Utils.getCleanUrl(filter.download.url);
					url = url.substr(0, url.lastIndexOf('/')) + '/' + format.uri;
					Utils.fetch(url).then((res) => {
						let m = Utils.praseHLS(res.body);
						filter.download.dlgmanifests.push(m);
						if(filter.download.dlgmanifests.length == numManifests){
							log.warn("got them all");
						}
					}).catch((e) => {
						log(e);
					});
				}
			}
		}
		else if(filter.isDashManifest())
		{
			parsedManifest = Utils.parseDASH(manifest, filter.download.url);
		}
		else
		{
			log.err("We got an unknown manifest:", manifest);
			return;
		}

		if(parsedManifest.segments.length == 0)
		{
			log('we got a main manifest: ', filter.download.url, parsedManifest);
			DLG.tabs[tabId].manifestSent = true;
			sendToYTDL = true;
		}
		else
		{
			log('we got a sub-manifest: ', filter.download.url, parsedManifest);
			//when the page only has a sub-manifest and not a main playlist
			//example of this: https://videoshub.com/videos/25312764
			if(!DLG.tabs[tabId].manifestSent)
			{
				log("but there has been no main manifest");
				sendToYTDL = true;
			}
		}

		if(sendToYTDL)
		{
			//hide it because we don't want to show it until we get the info
			filter.download.hidden = true;
			DLG.addToAllDownloads(filter.download);

			let msg = {
				type: NativeMessaging.MSGTYP_YTDL_INFO, 
				page_url: filter.download.tabUrl, 
				manifest_url: filter.download.url,
				dlHash: filter.download.getHash()
			};
			DLG.sendNativeMsg(msg);

		}
	}

}

