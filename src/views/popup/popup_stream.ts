class ViewStreamDetails extends PopupView
{
	protected htmlFile = 'popup_stream.html';
	private download: StreamDownload;
	private data: StreamDataUI;

	constructor(download: StreamDownload)
	{
		super();
		this.download = download;
		this.data = new StreamDataUI(this.download.streamData!);
	}

	protected async renderChildView()
	{	
		ui.get("#stream-details #formats-list")!.innerHTML = "";
		ui.get("#stream-details #filename")!.innerHTML = this.download.filename;
		ui.get("#stream-details #filename")!.setAttribute("title", this.download.filename);
		ui.get("#stream-details #duration")!.innerHTML = this.data.duration;
		ui.get("#stream-details #duration")!.setAttribute("title", this.data.duration);
	
		for(let format of this.data.formats)
		{
			//todo: convert these to ui.create()
			let li = document.createElement('li');
			li.setAttribute('class', 'format action');
			//todo: use 'data-action' instead of 'id' to specify action
			li.setAttribute('id', 'action-ytdl-format');
			li.setAttribute('data-format-id', format.id);
			document.querySelector("#stream-details #formats-list")!.appendChild(li);
	
			li.innerHTML = `${format.name} [ ${format.resString} / ~${format.fileSizeString} ]`;
		}

		if(this.download.type === 'youtube-video')
		{
			let li = ui.create('li', {
				'class': 'format action',
				'id': 'action-ytdl-audio',
			});
			ui.get('#stream-details #formats-list')!.appendChild(li);
			li.innerHTML = 'Download as MP3';
		}
	}

	protected onActionClicked(clickedAction: Element)
	{
		let id = clickedAction.id;

		switch(id)
		{

			case "action-ytdl-format":
				this.ytdlFormat(clickedAction.getAttribute('data-format-id')!);
				break;

			case "action-ytdl-audio":
				this.ytdlAudio();
				break;
	
			case "action-back":
				(new ViewDownloadsList()).render();
				break;
	
			default:
				break;
		}
	}

	private ytdlFormat(formatId: string)
	{
		let msg = new Messaging.MSGYTDLVideo(this.download.url, this.download.filename,
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