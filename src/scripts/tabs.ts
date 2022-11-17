namespace Tabs
{
	export async function startListeners()
	{
		browser.tabs.onCreated.addListener(doOnCreated);
		
		browser.tabs.onUpdated.addListener(doOnUpdated);

		browser.tabs.onRemoved.addListener(doOnRemoved);

		//put already open tabs in GB.tabs
		let tabs = await browser.tabs.query({});
		for(const tab of tabs)
		{
			GB.tabs.set(tab.id, new tabinfo(tab));
		}
	}

	function doOnCreated(tab: webx_tab)
	{
		GB.tabs.set(tab.id, new tabinfo(tab));
	}

	function doOnUpdated(tabId:number, changeInfo: any, tab: webx_tab)
	{
		GB.tabs.getsure(tabId).update(tab);
	}

	function doOnRemoved(tabId: number)
	{
		let tab = GB.tabs.getsure(tabId);
		tab.closed = true;
		
		//delete all downloads associated with this private tab
		if(tab.isPrivate)
		{
			GB.allDownloads.forEach((dl) => {
				if(dl.tabId === tabId)
				{
					GB.allDownloads.delete(dl.hash);
				}
			})
		}
	}
}