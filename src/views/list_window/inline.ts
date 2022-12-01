document.addEventListener("DOMContentLoaded", (e) => {
	browser.windows.getCurrent({populate: true}).then((window) => 
	{
		let url = window.tabs[0].url;
		let listType = Utils.getURLParam(url, 'listType') as list_window_type;
		if(listType === 'yt_playlist')
		{
			let dlHash = Utils.getURLParam(url, 'dlHash')!;
			(new YTPLaylistView(dlHash)).render();
		}
		else
		{
			let tabId = Number( Utils.getURLParam(url, 'tabId')! );
			(new LinksListView(listType, tabId)).render();
		}
	});
});