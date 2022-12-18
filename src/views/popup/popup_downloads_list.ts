class ViewDownloadsList extends PopupView
{
	protected htmlFile = 'popup_downloads_list.html';

	protected async renderChildView()
	{
		let tab = (await browser.tabs.query({currentWindow: true, active: true}))[0];
		let currTab = this.GBPop.tabs.getsure(tab.id);
	
		//populate list of downloads
		let keys = Array.from(this.GBPop.allDownloads.keys());
		//reverse to show latest downloads on top
		keys.reverse();
		
		for(const key of keys)
		{
			let download = this.GBPop.allDownloads.get(key)!;
	
			if(download.hidden){
				continue;
			}
	
			if(this.GBPop.options.showOnlyTabDls && download.ownerTabId != currTab.id){
				continue;
			}
	
			let listItem = ui.create('li', {
				'id': "action-showdl",
				'class': "dl-item action",
				'title': download.url,
				'data-hash': key
			});

			let icon = ui.create('img', {
				'src': `/icons/${download.filetype}.png`,
				'class': 'dl-icon'
			});

			let name = ui.create('span', {
				'class': 'dl-name'
			});
			name.innerHTML = download.filename

			listItem.appendChild(icon);
			listItem.appendChild(name);

			if(download.progress?.percent)
			{
				let percent = download.progress.percent;
				listItem.style.background = `linear-gradient(to right, #8c8fb1 ${percent}%, #fff 0%)`;
			}
		
			ui.get("#downloads-list")!.appendChild(listItem);
		}

		this.onProgress(this.handleProgress.bind(this));
	}

	private handleProgress(prog: progress_data)
	{
		let hash = prog.dlHash;
		let percent = prog.percent;
		let el = ui.get(`#downloads-list li[data-hash="${hash}"]`);
		if(typeof el != 'undefined')
		{
			el.style.background = `linear-gradient(to right, #8c8fb1 ${percent}%, #fff 0%)`;
		}
	}

	protected onActionClicked(clickedAction: Element)
	{
		let id = clickedAction.id;

		switch(id)
		{
			case "action-showdl":
				this.renderListItem(clickedAction);
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
		let selectedDl = this.GBPop.allDownloads.get(hash)!;

		log.d('item clicked: ', selectedDl);

		switch(selectedDl.type)
		{
			case 'download':
				(new ViewDownloadDetails(selectedDl)).render();
				break;
			
			case 'stream':
				(new ViewStreamDetails(selectedDl as StreamDownload)).render();
				break;

			case 'youtube-video':
				(new ViewStreamDetails(selectedDl as StreamDownload)).render();
				break;

			case 'reddit-video':
				(new ViewStreamDetails(selectedDl as StreamDownload)).render();
				break;

			case 'youtube-playlist':
				(new ListWindow('yt_playlist', selectedDl.hash)).display();
				break;
				
			default:
				console.warn('no view handler assigned for this download type', selectedDl);
				break;
		}
	}

	private clearDownloadsList()
	{
		ui.get("#downloads-list")!.innerHTML = '<li id="no-dl" style="display:none;">No Downloads</li>';
		let msg = new Messaging.MSGClearlist();
		Messaging.sendMessage(msg);
	}
}