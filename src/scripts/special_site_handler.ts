class SpecialSiteHandler implements RequestHandler
{
	private download: Download;
	private filter: RequestFilter;

	static readonly specialHandlers = ['youtube', 'reddit'] as const;

	//make sure we can only assign 'specialHandlers' type to these
	static readonly specialDomains: {[index: string]: typeof SpecialSiteHandler.specialHandlers[number]} = 
	{
		'www.youtube.com': 'youtube',
		'youtu.be': 'youtube',
		'www.youtube-nocookie.com': 'youtube',
		'www.reddit.com': 'reddit',
		'v.redd.it': 'reddit'
	};

	constructor(download: Download, filter: RequestFilter)
	{
		this.download = download;
		this.filter = filter;
	}

	handle(): Promise<webx_BlockingResponse>
	{
		switch(this.filter.getSpecialHandler())
		{
			case 'youtube':
				(new YoutubeHandler(this.download)).handle();
				break;
			case 'reddit':
				(new RedditHandler(this.download)).handle();
				break;
			default:
				break;
		}

		return Promise.resolve({cancel: false});
	}
}