namespace Tabs
{
	export async function startListeners()
	{
		browser.tabs.onCreated.addListener(doOnCreated);
		
		browser.tabs.onUpdated.addListener(doOnUpdated);

		browser.tabs.onRemoved.addListener(doOnRemoved);

		//put already open tabs in GRB.tabs
		let tabs = await browser.tabs.query({});
		for(const tab of tabs)
		{
			GRB.tabs.set(tab.id, new tabinfo(tab));
		}
	}

	function doOnCreated(tab: webx_tab)
	{
		GRB.tabs.set(tab.id, new tabinfo(tab));
	}

	function doOnUpdated(tabId:number, changeInfo: any, tab: webx_tab)
	{
		GRB.tabs.getsure(tabId).update(tab);
	}

	function doOnRemoved(tabId: number)
	{
		let tab = GRB.tabs.getsure(tabId);
		tab.closed = true;
		
		//delete all downloads associated with this private tab
		if(tab.isPrivate)
		{
			GRB.allDownloads.forEach((dl) => {
				if(dl.tabId === tabId)
				{
					GRB.allDownloads.delete(dl.hash);
				}
			})
		}
	}
}