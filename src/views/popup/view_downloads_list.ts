class ViewDownloadsList extends PopupView
{
	protected htmlFile = 'downloads_list.html';
	private DLGPop: DownloadGrabPopup;

	constructor(dlg: DownloadGrabPopup)
	{
		super();
		this.DLGPop = dlg;
	}

	protected async doRender()
	{
		let tab = (await browser.tabs.query({currentWindow: true, active: true}))[0];
		let currTab = this.DLGPop.tabs.getsure(tab.id);
	
		//populate list of downloads
		let keys = Array.from(this.DLGPop.allDownloads.keys());
		//reverse to show latest downloads on top
		keys.reverse();
		
		for(const key of keys)
		{
			let download = this.DLGPop.allDownloads.get(key)!;
	
			if(download.hidden){
				continue;
			}
	
			if(this.DLGPop.options.showOnlyTabDls && download.ownerTabId != currTab.id){
				continue;
			}
	
			let listItem = ui.create('li', {
				'id': "action-showdl",
				'class': "dl-item action",
				'title': download.url,
				'data-hash': key
			});
			let reason = (log.DEBUG)? " (" + download.classReason + ")" : "";
	
			listItem.innerHTML = download.filename + reason;
	
			ui.get("#downloads-list")!.appendChild(listItem);
		}
	}

	protected onActionClicked(id: string, e: Element)
	{
		switch(id)
		{
			case "action-showdl":
				this.renderListItem(e);
				break;

			case "action-clearList":
				this.clearDownloadsList();
				break;
	
			default:
				break;
		}
	}

	private renderListItem(listItem: Element)
	{
		let hash = listItem.getAttribute("data-hash")!;
		let selectedDl = this.DLGPop.allDownloads.get(hash)!;

		log.d('item clicked: ', selectedDl);

		if(selectedDl.isStream)
		{
			(new ViewStreamDetails(selectedDl)).render();
		}
		else if(typeof selectedDl.specialHandler != 'undefined')
		{
			switch(selectedDl.specialHandler)
			{
				case 'youtube-video':
					(new ViewYoutubeDetails(selectedDl)).render();
					break;
				default:
					break;
			}
		}
		else
		{
			(new ViewDownloadDetails(selectedDl)).render();
		}
	}

	private clearDownloadsList()
	{
		ui.get("#downloads-list")!.innerHTML = '<li id="no-dl" style="display:none;">No Downloads</li>';
		let msg = new Messaging.MSGClearlist();
		Messaging.sendMessage(msg);
	}
}