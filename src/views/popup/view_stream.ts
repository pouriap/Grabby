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
			let li = document.createElement('li');
			li.setAttribute('class', 'format action');
			li.setAttribute('id', 'action-ytdl-manifest');
			li.setAttribute('data-format-id', format.id.toString());
			document.querySelector("#stream-details #formats-list")!.appendChild(li);
	
			let uiData = new FormatDataUI(format);
			let name = uiData.name;
			let res = uiData.resString;
			let size = uiData.fileSizeString;
	
			li.innerHTML = `${name} [ ${res} / ~${size} ]`;
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
				let msg = new Messaging.MSGYTDLManifest(url, this.download.filename, this.download.hash);
				Messaging.sendMessage(msg);
				return;
			}
		}

		log.err(`format with id ${formatId} not found`);
	}
}