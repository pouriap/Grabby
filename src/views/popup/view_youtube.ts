class ViewYoutubeDetails extends PopupView
{
	protected htmlFile = 'stream_details.html';
	private download: Download;
	private data: StreamDataUI;

	constructor(download: Download)
	{
		super();
		this.download = download;
		this.data = StreamDataUI.getFromYTDLInfo(download.ytdlinfo!);
	}
	
	protected async doRender()
	{
		ui.get("#stream-details #formats-list")!.innerHTML = "";
	
		let duration = Utils.formatSeconds(this.data.duration);
		ui.get("#stream-details #filename")!.innerHTML = this.download.filename;
		ui.get("#stream-details #filename")!.setAttribute("title", this.download.filename);
		ui.get("#stream-details #duration")!.innerHTML = duration;
		ui.get("#stream-details #duration")!.setAttribute("title", duration);
	
		//sort
		this.data.formats.sort((a, b)=>{
			return a.pictureSize - b.pictureSize;
		});
	
		for(let format of this.data.formats)
		{
			//todo: convert these to ui.create()
			let li = document.createElement('li');
			li.setAttribute('class', 'format action');
			//todo: use 'data-action' instead of 'id' to specify action
			li.setAttribute('id', 'action-ytdl-video');
			li.setAttribute('data-format-id', format.id.toString());
			document.querySelector("#stream-details #formats-list")!.appendChild(li);
	
			let uiData = new FormatDataUI(format);
			let name = uiData.name;
			let res = uiData.resString;
			let size = uiData.fileSizeString;
	
			li.innerHTML = `${name} [ ${res} / ${size} ]`;
		}

		let li = ui.create('li', {
			'class': 'format action',
			'id': 'action-ytdl-audio',
		});
		ui.get('#stream-details #formats-list')!.appendChild(li);
		li.innerHTML = 'Download as MP3';
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
		let msg = new Messaging.MSGYTDLFormat(this.download.url, this.download.filename, 
			this.download.hash, formatId);
		Messaging.sendMessage(msg);
	}

	//todo: add music tag
	private ytdlAudio()
	{
		let msg = new Messaging.MSGYTDLAudio(this.download.url, this.download.filename, this.download.hash);
		Messaging.sendMessage(msg);		
	}
}