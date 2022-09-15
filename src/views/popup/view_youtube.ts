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
	
			li.innerHTML = `${name} [ ${res}px / ${size} ]`;
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