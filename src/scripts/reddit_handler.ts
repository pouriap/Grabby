class RedditHandler implements SpecialHandler
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

		let regex = /https:\/\/v\.redd\.it\/(.*)?\/DASHPlaylist/m;

		let match = url.match(regex);

		if(match)
		{
			log.d('handling reddit video');
			let videoId = match[1];
			let videoUrl = `https://v.redd.it/${videoId}`;

			//make a new download with a clean video page URL so that requests with extra
			//parameters don't get added as duplicates
			let details = this.download.httpDetails;
			details.url = videoUrl;
			let redditDL = new RedditDownload(details, GB.tabs);

			//don't request ytdlinfo if we already got this download
			let duplicate = GB.allDownloads.get(redditDL.hash);
			if(duplicate)
			{
				redditDL.copyData(duplicate as RedditDownload);
				GB.addToAllDownloads(redditDL);
				return;
			}	

			redditDL.hidden = true;
			GB.addToAllDownloads(redditDL);

			log.d('getting reddit video info', videoUrl);

			let msg = new NativeMessaging.MSG_YTDLInfo(redditDL.url, redditDL.hash);
			NativeMessaging.sendMessage(msg);
		}
	}
}