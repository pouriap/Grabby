//todo: add ability to cancel stream download
//todo: show percent and download speed
class StreamHandler implements RequestHandler
{
	private download: Download;
	private filter: ReqFilter;

	constructor(download: Download, filter: ReqFilter)
	{
		this.download = download;
		this.filter = filter;
	}

	handle()
	{		 
		this.receiveManifest().then((manifText) => 
		{	
			if(this.isRootManifest(manifText))
			{
				let tabid = this.download.tabId;
				if(typeof tabid === 'undefined')
				{
					log.err('this main manifest does not have a tab id');
				}

				let tab = GRB.tabs.getsure(tabid);
				if(tab.hasMainManifest)
				{
					//todo: if you refresh a tab you will get this 
					log.err('this tab already has a main manifest');
				}

				tab.hasMainManifest = true;

				// make a new download object with the tab URL as the url
				// currently the download object represents the manifest file but we want a 
				// download object that represents the page itself so the URL would be correct
				// for using with YTDL

				let videoUrl = this.download.ownerTabUrl;

				let details = this.download.httpDetails;
				details.url = videoUrl;
				let streamDL = new StreamDownload(details, GRB.tabs);
		
				//don't request ytdlinfo if we already got this download
				if(GRB.allDownloads.get(streamDL.hash))	return;
		
				streamDL.hidden = true;
				GRB.addToAllDownloads(streamDL);

				log.d('getting stream video info', videoUrl);
		
				let msg = new NativeMessaging.MSG_YTDLInfo(streamDL.url, streamDL.hash);
				NativeMessaging.sendMessage(msg);
			}
		});

		//we must continue the request so the manifest data can be read in our receiveManifest function
		return Promise.resolve({cancel: false});
	}

	//reads the manifest text from the request
	private receiveManifest(): Promise<string>
	{
		return new Promise((resolve) => 
		{
			let f = browser.webRequest.filterResponseData(this.download.requestId);
			let decoder = new TextDecoder("utf-8");
			let response = "";
			
			f.ondata = (evt: any) => {
				response += decoder.decode(evt.data, {stream: true});
				f.write(evt.data);
			}	

			f.onstop = (evt: any) => {
				f.disconnect();
				resolve(response);
			}
		});
	}

	private isRootManifest(rawManifest: string): boolean
	{
		try
		{
			if(this.filter.isHlsManifest())
			{
				//@ts-ignore
				let parser = new m3u8Parser.Parser();
				parser.push(rawManifest);
				parser.end();
				let rManifest = parser.manifest;
				return rManifest.playlists && rManifest.playlists.length;
			}
			else if(this.filter.isDashManifest())
			{
				//@ts-ignore
				let rManifest = mpdParser.parse(rawManifest, {manifestUri: this.download.url}) as dashRawManifest;
				return rManifest.playlists && rManifest.playlists.length;
			}
			else
			{
				log.warn("We got an unsupported manifest:", rawManifest);
				return false;
			}
		}
		catch(e)
		{
			log.warn("There was an error parsing the manifest:", rawManifest);
			return false;
		}
	}

}

