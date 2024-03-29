//todo: give filters to request listeners to ignore things we don't want
//todo: ignore scripts, fonts and other web resources that it's very unlikely someone wants to download with a DM

namespace RequestFiltering 
{
	export function startListeners()
	{
		browser.webRequest.onBeforeRequest.addListener(
			doOnBeforeRequest,
			{urls: ["*://*/*"]},
			["requestBody"]
		);
	
		browser.webRequest.onBeforeSendHeaders.addListener(
			doOnBeforeSendHeaders,
			{urls: ["*://*/*"]},
			["requestHeaders"]
		);
	
		browser.webRequest.onHeadersReceived.addListener(
			doOnHeadersReceived,
			{urls: ["*://*/*"]},
			["responseHeaders", "blocking"]
		);
	
		browser.webRequest.onCompleted.addListener(
			doOnCompleted,
			{urls: ["*://*/*"]},
			[]
		);

	}

	/**
	 * Runs before a request is sent
	 * Is used to store POST data and to put the request details in GB.allRequests
	 * If we don't store a request here it will be ignored by other callback functions below
	 */
	//todo: we can do some of our ignores here to be more efficient
	function doOnBeforeRequest(details: webx_beforeRequest): webx_BlockingResponse
	{
		//store the request details in GB.allRequests
		GB.allRequests.set(details.requestId, <HTTPDetails>details);

		return {cancel: false};
	}

	/**
	 * Runs before a request is sent
	 * Is used to store cookies, referer and other request info that is unavailable in reponse
	 */
	function doOnBeforeSendHeaders(details: webx_beforeSendHeaders): webx_BlockingResponse
	{
		//update http details
		let httpDetails = GB.allRequests.get(details.requestId);

		if(typeof httpDetails === 'undefined'){
			return {cancel: false};
		}

		Object.assign(httpDetails, details);
		return {cancel: false};
	}

	/**
	 * Runs once response headers are received 
	 * We create a download here if the response matches our criteria and add it 
	 * to our list of downloads
	 * @param details 
	 */
	function doOnHeadersReceived(details: webx_headersReceived): Promise<webx_BlockingResponse>
	{

		//log("receiving: ", details);

		//console.time(details.requestId);

		//update http details
		let httpDetails = GB.allRequests.get(details.requestId);
		
		if(typeof httpDetails === 'undefined'){
			return Promise.resolve({cancel: false});
		}

		Object.assign(httpDetails, details);

		//creating a new download object because the original will be deleted from allRequests
		//in doOnCompleted() after the request is completed or when GB.allDownloads is full
		let download = new BaseDownload(httpDetails, GB.tabs);

		let filter = new RequestFilter(download, Options.opt);

		if(isIgnored(filter)){
			return Promise.resolve({cancel: false});
		}

		let handler: RequestHandler;

		if(filter.getSpecialHandler())
		{
			handler = new SpecialSiteHandler(download, filter);
		}
		// This is for handling streams, aka requests for HLS and DASH manifests
		// Streams are AJAX and AJAX is ignored in the handling flow
		// Also for streams we have to wait until the manifest body is received and parse it 
		// which is async and doesn't work with our normal handling which is syn
		// Also streams are different in every way so we handle them here first
		else if(filter.isStreamManifest())
		{
			handler = new StreamHandler(download, filter);
		}
		// This is for normal downloads
		else
		{
			//some ignores specific to downloads
			if(filter.isAJAX() || filter.isSizeBlocked()){
				return Promise.resolve({cancel: false});
			}
			if(typeof filter.download.tabId === 'undefined')
			{
				log.warn('ignoring request with -1 tab id', filter.download);
				return Promise.resolve({cancel: false});
			}

			handler = new DownloadHandler(download, filter);
		}

		return handler.handle();
	}

	/**
	 * Runs once a request is completed
	 */
	function doOnCompleted(details: webx_reqCommon): webx_BlockingResponse
	{
		GB.allRequests.delete(details.requestId);
		return {cancel: false};
	}


	/**
	 * If the filter has an explicit action associated with it that ignores all rules
	 * then this function sets it
	 * @param filter 
	 */
	function isIgnored(filter: RequestFilter)
	{
		if(!filter.isStatusOK()) return true;

		if(filter.isWebSocket()) return true;

		if(filter.isBlackListed()) return true;

		if(filter.isExcludedInOpts()) return true;

		return false;
	}

}