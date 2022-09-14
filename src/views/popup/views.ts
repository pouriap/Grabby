abstract class PopupView
{
	protected abstract htmlFile: string;

	async render()
	{
		try
		{
			let html = await ui.fetchText(this.htmlFile);
			ui.get('#content')!.innerHTML = html;

			await this.doRender();
			//todo: check if we are assining listeners multiple times
			ui.getAll(".action").forEach((e) => {
				e.addEventListener('click', () => {
					let id = e.id;
					let disabled = e.getAttribute("class")?.indexOf("disabled-action") !== -1;
					if(disabled){
						return;
					}
					this.onActionClicked(id, e);
				});
			});
		}
		catch(e)
		{
			log.err('failed to prepare for render', e);
		}
	}

	protected abstract doRender(): Promise<void>;
	protected abstract onActionClicked(actionId: string, e: Element): void;
}

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

class ViewDownloadDetails extends PopupView
{
	protected htmlFile = 'download_details.html';
	private download: Download;

	constructor(dl: Download)
	{
		super();
		this.download = dl;
	}

	protected async doRender()
	{	
		ui.get("#download-details #filename")!.innerHTML = this.download.filename;
		ui.get("#download-details #filename")!.setAttribute("title", this.download.filename);
		ui.get("#download-details #size")!.innerHTML = 
			(this.download.size !== -1)? filesize(this.download.size) : this.download.size;
		ui.get("#download-details #url")!.innerHTML = this.download.url;
		ui.get("#download-details #url")!.setAttribute("title", this.download.url);
	
		VUtils.populateDMs();
	}

	onActionClicked(id: string)
	{
		switch(id)
		{
			case "action-download":
				if( (ui.get("#dl-with-dlgrab") as HTMLInputElement).checked){
					VUtils.downloadWithSelectedDM(this.download);
				}
				else{
					this.downloadWithFirefox();
				}
				break;
	
			case "action-back":
				VUtils.renderDownloadsList();
				break;		
	
			default:
				break;
		}
	}

	private downloadWithFirefox()
	{
		browser.downloads.download({
			filename: this.download.filename,
			saveAs: true,
			url: this.download.url
		});
	}
}

class ViewStreamDetails extends PopupView
{
	protected htmlFile = 'stream_details.html';
	private download: Download;
	private data: StreamDataUI;

	constructor(download: Download)
	{
		super();
		this.download = download;
		this.data = StreamDataUI.getFromManifest(download.manifest!);
	}

	protected async doRender()
	{	
		ui.get("#stream-details #formats-list")!.innerHTML = "";
	
		let duration = Utils.formatSeconds(this.data.duration);
		ui.get("#stream-details #filename")!.innerHTML = this.data.title;
		ui.get("#stream-details #filename")!.setAttribute("title", this.data.title);
		ui.get("#stream-details #duration")!.innerHTML = duration;
		ui.get("#stream-details #duration")!.setAttribute("title", duration);
	
		//sort
		this.data.formats.sort((a, b)=>{
			return a.pictureSize - b.pictureSize;
		});
	
		for(let format of this.data.formats)
		{
			let li = document.createElement('li');
			li.setAttribute('class', 'format action');
			li.setAttribute('id', 'action-ytdl-manifest');
			li.setAttribute('data-format-id', format.id.toString());
			document.querySelector("#stream-details #formats-list")!.appendChild(li);
	
			let name = format.nickName;
			let res = format.res;
			let size = filesize(format.fileSize, {round: 0});
	
			li.innerHTML = `${name} [ ${res}px / ~${size} ]`;
		}
	}

	protected onActionClicked(id: string, e: Element)
	{
		switch(id)
		{

			case "action-ytdl-manifest":
				this.ytdlManifest(Number(e.getAttribute('data-format-id')));
				break;
	
			case "action-back":
				VUtils.renderDownloadsList();
				break;
	
			default:
				break;
		}
	}

	private ytdlManifest(formatId: number)
	{
		let manifest = this.download.manifest!;
		for(let format of manifest.formats)
		{
			if(format.id === formatId)
			{
				let url = format.url;
				let msg = new Messaging.MSGYTDLManifest(url, manifest.title, this.download.hash);
				Messaging.sendMessage(msg);
				return;
			}
		}

		log.err(`format with id ${formatId} not found`);
	}
}

class ViewYoutubeDetails extends PopupView
{
	protected htmlFile = 'stream_details.html';
	private download: Download;
	private data: StreamDataUI;

	constructor(download: Download)
	{
		super();
		this.download = download;
		this.data = StreamDataUI.getFromManifest(download.manifest!);
	}
	protected async doRender()
	{
		ui.get("#stream-details #formats-list")!.innerHTML = "";
	
		let duration = Utils.formatSeconds(this.data.duration);
		ui.get("#stream-details #filename")!.innerHTML = this.data.title;
		ui.get("#stream-details #filename")!.setAttribute("title", this.data.title);
		ui.get("#stream-details #duration")!.innerHTML = duration;
		ui.get("#stream-details #duration")!.setAttribute("title", duration);
	
		//sort
		this.data.formats.sort((a, b)=>{
			return a.pictureSize - b.pictureSize;
		});
	
		for(let format of this.data.formats)
		{
			let li = document.createElement('li');
			li.setAttribute('class', 'format action');
			li.setAttribute('id', 'action-ytdl-video');
			li.setAttribute('data-format-id', format.id.toString());
			document.querySelector("#stream-details #formats-list")!.appendChild(li);
	
			let name = format.nickName;
			let res = format.res;
			let size = filesize(format.fileSize, {round: 0});
	
			li.innerHTML = `${name} [ ${res}px / ~${size} ]`;
		}
	}

	protected onActionClicked(id: string, e: Element)
	{
		switch(id)
		{
	
			case "action-ytdl-video":
				this.ytdlVideo(e.getAttribute('data-format-id')!);
				break;
	
			case "action-ytdl-audio":
				this.ytdlAudio();
				break;
	
			case "action-back":
				VUtils.renderDownloadsList();
				break;
	
			default:
				break;
		}
	}

	private ytdlVideo(formatId: string)
	{
		let msg = new Messaging.MSGYTDLVideo(this.download.url, this.download.filename, 
			this.download.hash, formatId);
		Messaging.sendMessage(msg);
	}

	private ytdlAudio()
	{

	}
}

//the defaul view for popup is the downloads list
VUtils.renderDownloadsList();

//download progress is sent to background via the native app, and then 
//sent here using messaging
browser.runtime.onMessage.addListener((msg: Messaging.MSGYTDLProg) => 
{ 
	if(msg.type === Messaging.TYP_YTDL_PROGRESS)
	{
		let percent = msg.percent;
		let dlHash = msg.dlHash;
		let el = ui.get(`#downloads-list li[data-hash="${dlHash}"]`);

		if(typeof el === 'undefined')
		{
			log.warn('received progress but corresponding UI is not present');
			return;
		}

		//remove the progress bar when download is complete
		if(percent == '100')
		{
			el.removeAttribute('style');
		}
		else{
			el.style.background = `linear-gradient(to right, #8c8fb1 ${percent}%, #fff 0%)`;
		}
	}
});