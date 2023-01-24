class YoutubeHandler implements SpecialHandler
{
	private download: BaseDownload;

	constructor(download: BaseDownload)
	{
		this.download = download;
	}

	//todo: add cookies, user-agent, etc. to ytdl
	handle(): void
	{
		let url = this.download.url;

		let domain = Utils.getDomain(url);
		let domainReg = domain.replace(/\./g, '\\.');

		let directVideo = new RegExp(`^https:\\/\\/${domainReg}\\/watch`, 'm');
		let directShort = new RegExp(`^https:\\/\\/${domainReg}\\/shorts`, 'm');
		let directPlaylist = new RegExp(`^https:\\/\\/${domainReg}\\/playlist`, 'm');
		let ajaxVideo = new RegExp(`^https:\\/\\/${domainReg}\\/youtubei\\/v1\\/player\\?key=.*`, 'm');

		if(url.match(directVideo))
		{
			log.d('handling youtube direct video');

			let u = new URL(url);
			let videoId = u.searchParams.get('v');
			let listId = u.searchParams.get('list');

			if(!videoId){
				log.err('video URL does not have "v" parameter');
			}

			if(listId){
				this.youtubeList(listId, domain, videoId);
			}
			else{
				this.youtubeVideo(videoId, domain);
			}
		}

		else if(url.match(directShort))
		{
			log.d('handling youtube direct short');

			let u = Utils.getFullPath(url);
			let videoId = u.substring(u.lastIndexOf('/') + 1);

			this.youtubeShort(videoId, domain);
		}

		else if(url.match(directPlaylist))
		{
			log.d('handling youtube direct playlist');

			let u = new URL(url);
			let listId = u.searchParams.get('list');

			if(!listId){
				log.err('playlist URL does not have "list" parameter');
			}

			this.youtubeList(listId, domain);
		}
		
		else if(url.match(ajaxVideo))
		{
			log.d('handling youtube ajax video');

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

				log.d('youtube ajax json is', json);

				if(!json.videoId){
					throw('Unexpected JSON data from youtube AJAX page');
				}

				let videoId = json.videoId;

				if(json.playlistId)
				{
					this.youtubeList(json.playlistId, domain, videoId);
				}
				else
				{
					this.youtubeVideo(videoId, domain);
				}				
			}
			catch(e)
			{
				log.err('youtube ajax page could not be parsed', this.download);
			}
		}
	}

	private youtubeVideo(videoId: string, domain: string)
	{
		//make a new download with a clean video page URL so that requests with extra
		//parameters don't get added as duplicates

		let videoUrl = `https://${domain}/watch?v=${videoId}`;

		let details = this.download.httpDetails;
		details.url = videoUrl;
		let youtubeDL = new YoutubeDownload(videoId, details, GB.tabs);

		//don't request ytdlinfo if we already got this download
		let duplicate = GB.allDownloads.get(youtubeDL.hash);
		if(duplicate)
		{
			youtubeDL.copyData(duplicate as YoutubeDownload);
			GB.addToAllDownloads(youtubeDL);
			return;
		}

		youtubeDL.hidden = true;
		GB.addToAllDownloads(youtubeDL);

		log.d('getting youtube video info', videoUrl);

		let msg = new NativeMessaging.MSG_YTDLInfo(youtubeDL.url, youtubeDL.hash);
		NativeMessaging.sendMessage(msg);
	}

	private youtubeShort(videoId: string, domain: string)
	{
		//make a new download with a clean video page URL so that requests with extra
		//parameters don't get added as duplicates

		let videoUrl = `https://${domain}/shorts/${videoId}`;

		let details = this.download.httpDetails;
		details.url = videoUrl;
		let youtubeDL = new YoutubeDownload(videoId, details, GB.tabs);

		//don't request ytdlinfo if we already got this download
		let duplicate = GB.allDownloads.get(youtubeDL.hash);
		if(duplicate)
		{
			youtubeDL.copyData(duplicate as YoutubeDownload);
			GB.addToAllDownloads(youtubeDL);
			return;
		}

		youtubeDL.hidden = true;
		GB.addToAllDownloads(youtubeDL);

		log.d('getting youtube short info', videoUrl);

		let msg = new NativeMessaging.MSG_YTDLInfo(youtubeDL.url, youtubeDL.hash);
		NativeMessaging.sendMessage(msg);
	}

	private youtubeList(listId: string, domain: string, videoId?: string)
	{
		//make a new download with a clean video page URL so that requests with extra
		//parameters don't get added as duplicates

		let playlistUrl: string;

		if(videoId)
		{
			playlistUrl = `https://${domain}/watch?v=${videoId}&list=${listId}`;
		}
		//direct playlist page, not all playlists support this
		else
		{
			playlistUrl = `https://${domain}/playlist?list=${listId}`;
		}
		

		let details = this.download.httpDetails;
		details.url = playlistUrl;
		let playlistDL = new YTPlaylistDownload(listId, details, GB.tabs);

		//don't request ytdlinfo if we already got this download
		let duplicate = GB.allDownloads.get(playlistDL.hash);
		if(duplicate)
		{
			playlistDL.copyData(duplicate as YTPlaylistDownload);
			GB.addToAllDownloads(playlistDL);
			return;
		}

		playlistDL.hidden = true;
		GB.addToAllDownloads(playlistDL);

		log.d('getting youtube playlist info', playlistUrl);

		let msg = new NativeMessaging.MSG_YTDLInfo(playlistDL.url, playlistDL.hash);
		NativeMessaging.sendMessage(msg);
	}
}