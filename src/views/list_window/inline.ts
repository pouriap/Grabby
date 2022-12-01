document.addEventListener("DOMContentLoaded", (e) => {
	browser.windows.getCurrent({populate: true}).then((window) => 
	{
		let url = window.tabs[0].url;
		let listType = Utils.getURLParam(url, 'listType') as list_window_type;
		if(listType === 'yt_playlist')
		{
			//(new YTPLaylistView()).render();
		}
		else
		{
			(new LinkListView(listType, url)).render();
		}
	});
});