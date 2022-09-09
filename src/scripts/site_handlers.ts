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
		let videoPage = /^https:\/\/www.youtube.com\/watch\?v=.*/gm;

		if(url.match(videoPage))
		{
			log.d('handling youtube video page');
			
			let msg = new NativeMessaging.MSG_YTDLInfo(url, this.download.hash);
			NativeMessaging.sendMessage(msg);
			this.download.specialHandler = 'youtube-video';
			this.download.hidden = true;
			DLG.addToAllDownloads(this.download);
			return;
		}
	}
}