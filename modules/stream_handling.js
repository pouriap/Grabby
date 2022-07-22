class StreamHandling
{
	/**
	 * 
	 * @param {number} requestId 
	 * @param {ReqFilter} filter 
	 */
	static receiveManifest(requestId, filter)
	{	
		let f = browser.webRequest.filterResponseData(requestId);
		let decoder = new TextDecoder("utf-8");
		let response = "";
	
		f.ondata = (event) => {
			response += decoder.decode(event.data, {stream: true});
			f.write(event.data);
		}
	  
		f.onstop = async (event) => {
			console.time("manifest-handling");
			let tabTitle = 'no-title';
			if(filter.download.tabId >= 0){
				tabTitle = (await browser.tabs.get(filter.download.tabId)).title;
			}
			StreamHandling.handle(filter, response, tabTitle);
			console.timeEnd("manifest-handling");
			//we first handle then give the request back to the browser
			//if we give it back to the browser first it will start requesting the 
			//sub-manifests before we had the chance to add them to DLG.tabs[tabId].knownPlaylists
			f.disconnect();
		}
	}

	/**
	 * Handles a DASH or HLS manifest download
	 * @param {ReqFilter} filter 
	 * @param {string} rawManifest 
	 * @param {number} tabTitle
	 */
	static handle(filter, rawManifest, tabTitle)
	{
		let bManifest = StreamHandling.parseRawManifest(filter, rawManifest, tabTitle);

		if(!bManifest){
			return;
		}

		let tabId = filter.download.tabId.toString();
		if(!DLG.tabs[tabId])
		{
			DLG.tabs[tabId] = {};
		}
		if(!DLG.tabs[tabId].knownPlaylists)
		{
			DLG.tabs[tabId].knownPlaylists = [];
		}

		if(bManifest.getType() === 'main')
		{
			//log('we got a main manifest: ', filter.download.url, bManifest);

			let manifest = MainManifest.getFromBase(bManifest);

			filter.download.manifest = manifest;
			filter.download.subManifests = [];
			DLG.addToAllDownloads(filter.download);

			for(let playlist of manifest.playlists)
			{
				DLG.tabs[tabId].knownPlaylists.push(playlist.url);
				//todo: change this to request ID because we are sending referer URL basically maybe some user doesn't want this
				let headers = {
					'X-DLG-MFSTHASH': filter.download.hash,
					'X-DLG-MFSTID': playlist.id
				};
				fetch(playlist.url, {headers: headers});
			}
		}

		else if(bManifest.getType() === 'playlist')
		{
			let manifest = PlaylistManifest.getFromBase(bManifest);
			let hash = filter.download.getHeader('X-DLG-MFSTHASH', 'request');
			let id = Number(filter.download.getHeader('X-DLG-MFSTID', 'request'));

			//if it has a hash header it means it's a playlist we reqested
			if(hash)
			{
				/**
				 * @type {Download}
				 */
				let download = DLG.allDownloads.get(hash);
				download.subManifests.push(manifest);
				download.manifest.playlists[id].update(manifest);
				if(download.subManifests.length == download.manifest.playlists.length)
				{
					log('got all manifests for: ', download);
				}
			}

			//for cases when the page only has a sub-manifest without a main manifest
			//example of this: https://videoshub.com/videos/25312764
			else if(!DLG.tabs[tabId].knownPlaylists.includes(bManifest.url))
			{
				//log.warn(DLG.tabs[tabId].knownPlaylists, 'does not contain', filter.download.url, 'tabid: ', tabId);
				filter.download.manifest = PlaylistManifest.getFromBase(bManifest);
				log('got a single manifest for: ', filter.download);
			}
		}

	}

	/**
	 * Parses a manifest text and returns a StreamManifest object
	 * @param {ReqFilter} filter 
	 * @param {string} rawManifest 
	 * @returns {StreamManifest}
	 */
	static parseRawManifest(filter, rawManifest, title)
	{
		if(filter.isHlsManifest())
		{
			let parser = new m3u8Parser.Parser();
			parser.push(rawManifest);
			parser.end();
			let pManifest = parser.manifest;
			return new StreamManifest(filter.download.url, title, 'hls', pManifest);
		}

		else if(filter.isDashManifest())
		{
			let pManifest = mpdParser.parse(rawManifest, {manifestUri: manifestURL});
			return new StreamManifest(filter.download.url, title, 'dash', pManifest);
		}

		else
		{
			log.err("We got an unsupported manifest:", rawManifest);
			return undefined;
		}
	}

}

