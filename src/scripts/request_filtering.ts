namespace RequestFiltering 
{
	export function startListeners()
	{
		browser.webRequest.onBeforeRequest.addListener(
			(details: any) => { return doOnBeforeRequest(details) }, 
			{urls: ["*://*/*"]},
			["requestBody"]
		);
	
		browser.webRequest.onBeforeSendHeaders.addListener(
			(details: any) => { return doOnBeforeSendHeaders(details) }, 
			{urls: ["*://*/*"]},
			["requestHeaders"]
		);
	
		browser.webRequest.onHeadersReceived.addListener(
			(details: any) => { return doOnHeadersReceived(details) }, 
			{urls: ["*://*/*"]},
			["responseHeaders", "blocking"]
		);
	
		browser.webRequest.onCompleted.addListener(
			(details: any) => { return doOnCompleted(details) }, 
			{urls: ["*://*/*"]},
			[]
		);

	}

	/**
	 * Runs before a request is sent
	 * Is used to store POST data 
	 */
	function doOnBeforeRequest(details: any)
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
		let request = {postData: postData};

		DLG.allRequests.put(details.requestId, request);
	}

	/**
	 * Runs before a request is sent
	 * Is used to store cookies, referer and other request info that is unavailable in reponse
	 */
	function doOnBeforeSendHeaders(details: any)
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
	function doOnHeadersReceived(details: any)
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

		// This is for handling streams, aka requests for HLS and DASH manifests
		// Streams are AJAX and AJAX is ignored in the handling flow
		// Also for streams we have to wait until the manifest body is received and parse it 
		// which is async and doesn't work with our normal handling which is syn
		// Also streams are different in every way so we handle them here first
		if(filter.isStreamManifest())
		{
			download.isStream = true;
			download.hidden = true;
			StreamHandler.receiveManifest(details.requestId, filter);
		}

		// This is for normal downloads
		if(!isIgnored(download, filter))
		{
			DownloadHandler.handle(download, filter);
		}

		//perform said action
		return performAction(download);
		
	}

	/**
	 * Runs once a request is completed
	 */
	function doOnCompleted(details: any)
	{
		//remove the original download from allRequests to save memory
		//this isn't really necessary because allRequest is a fixed sized map
		//todo: try adding this to onResponseStarted
		DLG.allRequests.remove(details.requestId);
	}


	/**
	 * If the filter has an explicit action associated with it that ignores all rules
	 * then this function sets it
	 * @param download 
	 * @param filter 
	 */
	function isIgnored(download: Download, filter: ReqFilter)
	{
		if(!filter.isStatusOK()){
			return true;
		}

		if(filter.isWebSocket()){
			return true;
		}

		//todo: fix this madness
		if(filter.isBlackListed(DLG.blacklist)){
			return true;
		}

		//ain't no download in AJAX
		if(filter.isAJAX()){
			return true;
		}

		if(filter.isExcludedInOpts()){
			return true;
		}

		if(filter.isSizeBlocked()){
			return true;		
		}

		return false;
	}

	/**
	 * Performs the action that is assigned to a request in determineAction()
	 * @param download 
	 */
	function performAction(download: Download)
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
				DLG.doDownloadJob(job);
			});
			return {cancel: true};
		}

		if(download.act === ReqFilter.ACT_GRAB && DLG.options.overrideDlDialog){
			//the request will be paused until this promise is resolved
			return new Promise(function(resolve)
			{
				download.resolve = resolve;
				DLG.showDlDialog(download);
			});
		}
		
	}

}

