//todo: add ability to cancel stream download
//todo: show percent and download speed

declare var m3u8Parser : any;
declare var mpdParser: any;

class StreamHandler implements RequestHandler
{
	download: Download;
	filter: ReqFilter;

	constructor(download: Download, filter: ReqFilter)
	{
		this.download = download;
		this.filter = filter;
	}

	handle()
	{
		this.download.isStream = true;
		this.download.hidden = true;
		this.receiveManifest(this.download.requestId, this.filter);
		//we always continue the request for streams cause we don't wanna block anything
		return Promise.resolve({cancel: false});
	}

	/**
	 * Receives the response body of the manifest request and prepares it for parsing
	 * @param requestId
	 * @param filter
	 */
	private receiveManifest(requestId: string, filter: ReqFilter)
	{	
		let f = browser.webRequest.filterResponseData(requestId);
		let decoder = new TextDecoder("utf-8");
		let response = "";
	
		f.ondata = (event: any) => {
			response += decoder.decode(event.data, {stream: true});
			f.write(event.data);
		}
	  
		f.onstop = (event: any) => {
			console.time("manifest-handling");
			this.doHandle(filter, response);
			console.timeEnd("manifest-handling");
			//we first handle then give the request back to the browser
			//if we give it back to the browser first it will start requesting the 
			//sub-manifests before we had the chance to add them to DLG.tabs[tabId].knownPlaylists
			f.disconnect();
		}
	}

	private doHandle(filter: ReqFilter, rawManifest: string)
	{
		let bManifest = this.parseRawManifest(filter, rawManifest);

		if(!bManifest){
			return;
		}

		//requests for playlists that DLG sends do not have a tab id
		let tabId = filter.download.tabId;
		let streamTab = (typeof tabId != 'undefined')? DLG.tabs.get(tabId) : undefined;

		if(bManifest.getType() === 'main')
		{
			//log('we got a main manifest: ', filter.download.url, bManifest);

			if(typeof streamTab === 'undefined'){
				log.err('this main stream does not have a tab', filter.download);
			}

			let manifest = MainManifest.getFromBase(bManifest);

			filter.download.manifest = manifest;

			DLG.addToAllDownloads(filter.download);

			for(let playlist of manifest.playlists)
			{
				streamTab.knownPlaylistUrls.push(playlist.url);
				//todo: change this to request ID because we are sending referer URL basically maybe some user doesn't want this
				let headers = {
					'X-DLG-MFSTHASH': filter.download.hash,
					'X-DLG-MFSTID': playlist.id.toString()
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
				let download = DLG.allDownloads.get(hash)!;

				if(!download.manifest){
					log.err('Download does not have a manifest', download);
				}

				download.fetchedPlaylists++;
				download.manifest.playlists[id].update(manifest);

				if(download.fetchedPlaylists == download.manifest.playlists.length)
				{
					log.d('got all manifests for: ', download);
					download.hidden = false;
				}
			}

			//for cases when the page only has a sub-manifest without a main manifest
			//example of this: https://videoshub.com/videos/25312764
			else if(streamTab && !streamTab.knownPlaylistUrls.includes(bManifest.url))
			{
				//log.warn(DLG.tabs[tabId].knownPlaylists, 'does not contain', filter.download.url, 'tabid: ', tabId);
				//we have to manually create a proper MainManifest for this download here
				let playlist = new Playlist(0, 'single-video', bManifest.url, 'unknown', 0, 0);
				playlist.update(manifest);
				let pls = [playlist];
				let m = new MainManifest(bManifest, pls, manifest.title);
				filter.download.manifest = m;
				log.d('got a single manifest for: ', filter.download);
			}

			else if(typeof streamTab === 'undefined')
			{
				log.err('this playlist stream does not have a tab', filter.download);
			}
		}

	}

	private parseRawManifest(filter: ReqFilter, rawManifest: string): StreamManifest | undefined
	{
		let streamTitle = (filter.download.tabTitle)? filter.download.tabTitle : 'Unknown Title';

		if(filter.isHlsManifest())
		{
			let parser = new m3u8Parser.Parser();
			parser.push(rawManifest);
			parser.end();
			let pManifest = parser.manifest;
			return new StreamManifest(
				filter.download.url, streamTitle, 'hls', pManifest);
		}

		else if(filter.isDashManifest())
		{
			let pManifest = mpdParser.parse(rawManifest, {manifestUri: filter.download.url});
			return new StreamManifest(
				filter.download.url, streamTitle, 'dash', pManifest);
		}

		else
		{
			log.warn("We got an unsupported manifest:", rawManifest);
			return undefined;
		}
	}

}

