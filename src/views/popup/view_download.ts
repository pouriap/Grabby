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
				if( (ui.get("#dl-with-grabby") as HTMLInputElement).checked){
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