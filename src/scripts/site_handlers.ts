class SpecialSiteHandler implements RequestHandler
{
	download: Download;
	filter: ReqFilter;

	constructor(download: Download, filter: ReqFilter)
	{
		this.download = download;
		this.filter = filter;
	}

	handle(): Promise<webx_BlockingResponse>
	{
		switch(this.filter.getSpecialHandler())
		{
			case 'youtube':
				this.handleYoutube();
				break;
			default:
				break;
		}

		return Promise.resolve({cancel: false});
	}

	handleYoutube()
	{
		let url = this.download.url;
		let videoPage = /^https:\/\/www\.youtube\.com\/watch\?v=.*/gm;
		let ajaxPage = /^https:\/\/www\.youtube\.com\/youtubei\/v1\/player\?key=.*/gm;

		if(url.match(videoPage))
		{
			log.d('handling youtube video page');
			let msg = new NativeMessaging.MSG_YTDLInfo(url, this.download.hash);
			NativeMessaging.sendMessage(msg);
			this.download.specialHandler = 'youtube-video';
			this.download.hidden = true;
			DLG.addToAllDownloads(this.download);
		}
		
		else if(url.match(ajaxPage))
		{
			log.d('handling youtube ajax page');

			if(
				typeof this.download.requestBody === 'undefined' ||
				typeof this.download.requestBody.raw === 'undefined' ||
				typeof this.download.requestBody.raw[0].bytes === 'undefined'
			){
				log.err('youtube ajax page has bad request body', this.download);
			}

			try
			{			  
				let dec = new TextDecoder("utf-8");
				let jsonStr = dec.decode(this.download.requestBody.raw[0].bytes);
				let json = JSON.parse(jsonStr);

				if(typeof json.videoId != 'string' || json.videoId.length === 0){
					throw('bad json data');
				}

				//create a new Download object with its URL set to the would-be video URL of this request
				let videoId = json.videoId;
				let videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
				let details = this.download.httpDetails;
				details.url = videoUrl;
				let newDL = new Download(details, DLG.tabs);

				let msg = new NativeMessaging.MSG_YTDLInfo(videoUrl, newDL.hash);
				NativeMessaging.sendMessage(msg);
				newDL.specialHandler = 'youtube-video';
				newDL.hidden = true;
				DLG.addToAllDownloads(newDL);
			}
			catch(e)
			{
				log.err('youtube ajax page could not be parsed', this.download);
			}
		}
	}
}