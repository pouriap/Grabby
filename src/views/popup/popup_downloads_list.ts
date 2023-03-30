class ViewDownloadsList extends PopupView
{
	protected htmlFile = 'popup_downloads_list.html';

	protected async renderChildView()
	{
		let tab = await Utils.getCurrentTab();
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

			// download icon
			let icon = ui.create('img', {'src': download.iconURL, 'class': 'dl-icon'}) as HTMLImageElement;
			icon.classList.add(`icon-${download.iconSize}`);
			
			if(isVideoDownload(download))
			{
				if(download.thumbData)
				{
					icon.src = download.thumbData;
				}
				else
				{
					download.getThumbnail().then((data) => 
					{
						icon.src = data;
						//update the size  cause thumbnails have bigger size
						icon.classList.add(`icon-${download.iconSize}`);
						//update the thumbnail in bg context so we won't have to load it every time in popup
						let msg = new Messaging.MSGUpdateVideoThumb(download.hash, data);
						Messaging.sendMessage(msg);
					});
				}
			}

			// download name
			let name = ui.create('span', {'class': 'dl-name'});
			name.innerHTML = download.filename;
			
			// download extra info
			let extra = ui.create('span', {'class': 'dl-extra'});
			extra.innerHTML = download.type;
			extra.setAttribute('data-type', download.type);

			// container of name and extra info
			let infoDiv = ui.create('div', {'class': 'dl-info'});
			infoDiv.appendChild(name);
			infoDiv.appendChild(extra);

			// container of info and icon divs
			let wrapperDiv = ui.create('div', {'class': 'dl-wrapper'});
			wrapperDiv.appendChild(icon);
			wrapperDiv.appendChild(infoDiv);

			// progress bar
			let progDiv = ui.create('div', {'class': 'progress-bar', 'style': 'display: none;'});
			let progFill = ui.create('span', {'class': 'progress-bar-fill', 'style': 'width:0%;'});
			progDiv.appendChild(progFill);

			if(download.progress)
			{
				if(download.progress.status)
				{
					extra.innerHTML = download.type + ` - Status: ${download.progress.status}`;
				}

				if(download.progress.status === 'Complete')
				{
					progFill.style.width = '100%';
					progDiv.style.display = 'block';
				}
				else if(download.progress.percent)
				{
					let percent = download.progress.percent;
					progFill.style.width = `${percent}%`;
					progDiv.style.display = 'block';
				}
			}

			// make a list item and add everything to it
			let listItem = ui.create('li', {
				'id': "action-showdl",
				'class': "dl-item action",
				'title': download.url,
				'data-hash': key
			});

			listItem.appendChild(wrapperDiv);
			listItem.appendChild(progDiv);

			let separator = ui.create('li', {'class': 'separator'});
		
			let list = ui.get("#downloads-list")!;
			list.appendChild(listItem);
			list.appendChild(separator);
		}

		this.onProgress(this.handleProgress.bind(this));
	}

	private handleProgress(msg: Messaging.MSGYTDLProg)
	{
		let dlHash = msg.dlHash;
		let percent = msg.progress.percent;

		let progFill = ui.get(`#downloads-list li[data-hash="${dlHash}"] .progress-bar-fill`)!;
		let extra = ui.get(`#downloads-list li[data-hash="${dlHash}"] .dl-extra`)!;
		let type = extra.getAttribute('data-type');
		extra.innerHTML = type + ` - Status: ${msg.progress.status}`;

		progFill.style.width = `${percent}%`;
		progFill.parentElement!.style.display = 'block';
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

		if(isFileDownload(selectedDl))
		{
			(new ViewDownloadDetails(selectedDl)).render();
			return;
		}

		switch(selectedDl.type)
		{
			case 'Video Stream':
				(new ViewStreamDetails(selectedDl as StreamDownload)).render();
				break;

			case 'YouTube Video':
				(new ViewStreamDetails(selectedDl as StreamDownload)).render();
				break;

			case 'Reddit Video':
				(new ViewStreamDetails(selectedDl as StreamDownload)).render();
				break;

			case 'YouTube Playlist':
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