class StreamHandling
{
	static receiveManifest(requestId, filter)
	{	
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
			parsedManifest = StreamHandling.parseHLS(manifest, filter.download.url);

			filter.download.dlgmanifests = [];

			if(parsedManifest.playlists && parsedManifest.playlists.length > 0)
			{
				var numManifests = parsedManifest.playlists.length;

				for(let format of parsedManifest.playlists)
				{
					Utils.fetch(format.uri).then((res) => {
						let m = StreamHandling.parseHLS(res.body);
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
			parsedManifest = StreamHandling.parseDASH(manifest, filter.download.url);
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

	/**
	 * Parses a .m3u8 HLS manifest
	 * @param {string} manifest 
	 * @returns The parsed manifest as a JSON object
	 */
	static parseHLS(manifest, manifestURL)
	{
		let parser = new m3u8Parser.Parser();
		parser.push(manifest);
		parser.end();
		let pManifest = parser.manifest;

		//if the links to the sub-manifests(playlists) are not absolute paths then there might
		//be issues later because we are in the addon context and not the web page context
		//so for example a playlist with the link 'playlist-720p.hls' should become https://videosite.com/playlist-720p.hls
		//but instead it becomes moz-extension://6286c73d-d783-40a8-8a2c-14571704f45d/playlist-720p.hls
		//the issue was resolved after using fetch() instead of XMLHttpRequest() but I kept this just to be safe
		if(pManifest.playlists && pManifest.playlists.length > 0)
		{
			for(let format of pManifest.playlists)
			{
				format.uri = (new URL(format.uri, manifestURL)).toString();
			}
		}

		return pManifest;
	}

	/**
	 * Parses a .mpd DASH manifest
	 * @param {string} manifest 
	 * @param {string} manifestURL 
	 * @returns The parsed manifest as a JSON object
	 */
	static parseDASH(manifest, manifestURL)
	{
		return mpdParser.parse(manifest, {manifestUri: manifestURL});
	}
}

