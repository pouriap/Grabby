class YoutubeHandler implements SiteHandler
{
	tab: webx_tab;

	constructor(tab: webx_tab){
		this.tab = tab;
	}

	handle()
	{
		let path = Utils.getPath(this.tab.url);

		//ignore channels
		if(path.startsWith('/c/')) return; 
		//ignore youtube main page
		if(path.replace(/\//g, '').length === 0) return;

		let msg = new NativeMessaging.MSG_YTDLInfo(this.tab.url, this.tab.id);
		NativeMessaging.sendMessage(msg);
		log.d('sending ytdl message', msg);

		DLG.tabs.getsure(this.tab.id).specialHandler = 'youtube';
	}

}