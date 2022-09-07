namespace Tabs
{
	export async function startListeners()
	{
		browser.tabs.onCreated.addListener(doOnCreated);

		//'url' is only supported in FF88+
		let info = await browser.runtime.getBrowserInfo();
		let version = info.version.split('.')[0];
		let props = (version < 88)? ["status", "title"] :  ["status", "title", "url"];
		
		browser.tabs.onUpdated.addListener(doOnUpdated, {properties: props});

		browser.tabs.onRemoved.addListener(doOnRemoved);

		//put already open tabs in DLG.tabs
		let tabs = await browser.tabs.query({});
		for(const tab of tabs)
		{
			DLG.tabs.set(tab.id, new tabinfo(tab));
		}
	}

	function doOnCreated(tab: webx_tab)
	{
		DLG.tabs.set(tab.id, new tabinfo(tab));
	}

	function doOnUpdated(tabId:number, changeInfo: any, tab: webx_tab)
	{
		DLG.tabs.set(tabId, new tabinfo(tab));
		if(typeof changeInfo.status != 'undefined' && changeInfo.status === 'complete')
		{
			handleSpecialSites(tab);
		}
	}

	function doOnRemoved(tabId: number)
	{
		let tab = DLG.tabs.getsure(tabId);
		tab.closed = true;
	}

	function handleSpecialSites(tab: webx_tab)
	{
		for(let domain of Object.keys(constants.specialSites))
		{
			if(Utils.getDomain(tab.url) != domain){
				continue;
			}

			let site = constants.specialSites[domain];
			let handler: SiteHandler;

			if(site === 'youtube')
			{
				handler = new YoutubeHandler(tab);
			}
			else
			{
				log.err(`no handler available for ${site}`);
			}

			handler.handle();
		}
	}
}