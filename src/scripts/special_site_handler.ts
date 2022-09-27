class SpecialSiteHandler implements RequestHandler
{
	private download: Download;
	private filter: ReqFilter;

	static readonly specialHandlers = ['youtube'] as const;

	//make sure we can only assign 'specialHandlers' type to these
	static readonly specialDomains: {[index: string]: typeof SpecialSiteHandler.specialHandlers[number]} = 
	{
		'www.youtube.com': 'youtube',
		'youtu.be': 'youtube',
		'www.youtube-nocookie.com': 'youtube',
	};

	static readonly specialTypes = ['youtube-video'] as const;

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
				(new YoutubeHandler(this.download)).handle();
				break;
			default:
				break;
		}

		return Promise.resolve({cancel: false});
	}
}