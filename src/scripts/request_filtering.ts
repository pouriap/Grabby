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
	 * @param details 
	 */
	function doOnHeadersReceived(details: any): Promise<webx_BlockingResponse>
	{

		//log("receiving: ", details);

		//console.time(details.requestId);

		let requestId = details.requestId;
		let requestOfThisResponse = DLG.allRequests.get(requestId);
		
		if(typeof requestOfThisResponse === 'undefined'){
			return Promise.resolve({cancel: false});
		}

		//creating a new download object because the original will be deleted from allRequests
		//in doOnCompleted() after the request is completed or when DLG.allDownloads is full
		let download = new Download(requestOfThisResponse.details, details);

		let filter = new ReqFilter(download, DLG.options);

		if(isIgnored(filter)){
			return Promise.resolve({cancel: false});
		}

		let handler: RequestHandler;

		// This is for handling streams, aka requests for HLS and DASH manifests
		// Streams are AJAX and AJAX is ignored in the handling flow
		// Also for streams we have to wait until the manifest body is received and parse it 
		// which is async and doesn't work with our normal handling which is syn
		// Also streams are different in every way so we handle them here first
		if(filter.isStreamManifest())
		{
			handler = new StreamHandler(download, filter);
		}
		// This is for normal downloads
		else
		{
			handler = new DownloadHandler(download, filter);
		}

		return handler.handle();
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
	 * @param filter 
	 */
	function isIgnored(filter: ReqFilter)
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

		if(filter.isAJAX() && !filter.isStreamManifest()){
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

}

