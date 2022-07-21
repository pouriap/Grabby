class StreamHandling
{
	static receiveManifest(requestId)
	{
		download.act = ReqFilter.ACT_IGNORE;
	
		let f = browser.webRequest.filterResponseData(requestId);
		let decoder = new TextDecoder("utf-8");
		let response = "";
	
		f.ondata = (event) => {
			response += decoder.decode(event.data, {stream: true});
			f.write(event.data);
		}
	  
		f.onstop = (event) => {
			f.disconnect();
			StreamHandling.handle(filter, response);
		}
	}

	/**
	 * Handles a DASH or HLS manifest download
	 * @param {ReqFilter} filter 
	 * @param {string} manifest 
	 */
	static handle(filter, manifest)
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
					//todo: get absolute URL of playlist URLs
					//they may be absolute (https://xxxx), or from base domain (/xxxx)
					//or relative (xxxx.m3u8)
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

