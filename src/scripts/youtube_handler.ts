class YoutubeHandler implements SpecialHandler
{
	private download: Download;

	constructor(download: Download)
	{
		this.download = download;
	}

	//todo: add cookies, user-agent, etc. to ytdl
	handle(): void
	{
		let url = this.download.url;

		let domain = Utils.getDomain(url);
		let domainReg = domain.replace(/\./g, '\\.');

		let directPage = new RegExp(`^https:\\/\\/${domainReg}\\/watch`, 'm');
		let ajaxPage = new RegExp(`^https:\\/\\/${domainReg}\\/youtubei\\/v1\\/player\\?key=.*`, 'm');

		if(url.match(directPage))
		{
			log.d('handling youtube direct page');

			let u = new URL(url);
			let videoId = u.searchParams.get('v');
			let listId = u.searchParams.get('list');

			if(!videoId){
				log.err('video URL does not have "v" query');
			}

			if(listId){
				this.youtubeList(videoId, listId, domain);
			}
			else{
				this.youtubeSingle(videoId, domain);
			}
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
				this.youtubeSingle(videoId, domain);
			}
			catch(e)
			{
				log.err('youtube ajax page could not be parsed', this.download);
			}
		}
	}

	private youtubeSingle(videoId: string, domain: string)
	{
		//make a new download with a clean video page URL so that requests with extra
		//parameters don't get added as duplicates

		let videoUrl = `https://${domain}/watch?v=${videoId}`;

		let details = this.download.httpDetails;
		details.url = videoUrl;
		let youtubeDL = new YoutubeDownload(details, GRB.tabs);

		//don't request ytdlinfo if we already got this download
		if(GRB.allDownloads.get(youtubeDL.hash))	return;

		youtubeDL.hidden = true;
		GRB.addToAllDownloads(youtubeDL);

		log.d('getting youtube video info', videoUrl);

		let msg = new NativeMessaging.MSG_YTDLInfo(youtubeDL.url, youtubeDL.hash);
		NativeMessaging.sendMessage(msg);
	}

	private youtubeList(videoId: string, listId: string, domain: string)
	{
		log.warn('playlist handling not implemented');
	}
}