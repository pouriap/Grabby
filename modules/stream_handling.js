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
	 * @param {string} rawManifest 
	 */
	static handle(filter, rawManifest)
	{
		let tabId = filter.download.tabId.toString();

		if(!DLG.tabs[tabId]){
			DLG.tabs[tabId] = {};
		}

		let manifest = StreamHandling.parseManifest(filter, rawManifest);

		if(manifest.isMain())
		{
			//log('we got a main manifest: ', filter.download.url, manifest);
			DLG.tabs[tabId].hasMainManifest = true;

			filter.download.playlists = [];

			var numPlaylists = manifest.playlistURLs.length;

			for(let url of manifest.playlistURLs)
			{
				Utils.fetch(url).then((res) => 
				{
					let m = StreamHandling.parseManifest(res.body);
					filter.download.playlists.push(m);
					if(filter.download.playlists.length == numPlaylists)
					{
						StreamHandling.parsePlaylists(filter.download);
					}
				})
				.catch((e) => {
					log(e);
				});
			}
		}
		else if(manifest.isPlaylist())
		{
			//log('we got a sub-manifest: ', filter.download.url, manifest);
			//for cases when the page only has a sub-manifest and not a main playlist
			//example of this: https://videoshub.com/videos/25312764
			if(!DLG.tabs[tabId].hasMainManifest)
			{
				filter.download.playlists.push(manifest);
				StreamHandling.parsePlaylists(filter.download);
			}
		}
		else
		{
			log.err('We got an unknown type of manifest:', rawManifest);
		}
	}

	/**
	 * Parses a manifest text and returns a StreamManifest object
	 * @param {ReqFilter} filter 
	 * @param {string} rawManifest 
	 * @returns {StreamManifest}
	 */
	static parseManifest(filter, rawManifest)
	{
		if(filter.isHlsManifest())
		{
			return StreamHandling.parseHLS(rawManifest, filter.download.url);
		}
		else if(filter.isDashManifest())
		{
			return StreamHandling.parseDASH(rawManifest, filter.download.url);
		}
		else
		{
			log.err("We got an unsupported manifest:", rawManifest);
			return;
		}
	}


	/**
	 * Parses all playlists contained in a Download object
	 * Parsing includes extracting all the info such as length, size, etc.
	 * @param {Download} download 
	 */
	static parsePlaylists(download)
	{
		log.warn("got them all");
	}

	/**
	 * Parses a .m3u8 HLS manifest and returns a StreamManifest object
	 * @param {string} manifest 
	 * @param {string} manifestURL 
	 * @returns {StreamManifest}
	 */
	static parseHLS(manifest, manifestURL)
	{
		let parser = new m3u8Parser.Parser();
		parser.push(manifest);
		parser.end();
		
		let pManifest = parser.manifest;

		return new StreamManifest(manifestURL, pManifest);
	}

	/**
	 * Parses a .mpd DASH manifest and returns a StreamManifest object
	 * @param {string} manifest 
	 * @param {string} manifestURL 
	 * @returns {StreamManifest}
	 */
	static parseDASH(manifest, manifestURL)
	{
		let pManifest = mpdParser.parse(manifest, {manifestUri: manifestURL});
		return new StreamManifest(manifestURL, pManifest);
	}
}

