class ViewDownloadDetails extends PopupView
{
	protected htmlFile = 'popup_download.html';
	private download: GrabbedDownload;

	constructor(dl: GrabbedDownload)
	{
		super();
		this.download = dl;
	}

	protected async renderChildView()
	{	
		ui.get("#download-details #filename")!.innerHTML = this.download.filename;
		ui.get("#download-details #filename")!.setAttribute("title", this.download.filename);
		ui.get("#download-details #size")!.innerHTML = 
			(this.download.size)? filesize(this.download.size) : 'unknown';
		ui.get("#download-details #url")!.innerHTML = this.download.url;
		ui.get("#download-details #url")!.setAttribute("title", this.download.url);
	
		let selector = this.getDMSelector();
		ui.get('#dm-list-container')?.appendChild(selector);

		if(selector.classList.contains('disabled'))
		{
			ui.get('#dl-with-grabby')?.removeAttribute('checked');
			ui.get('#dl-with-browser')?.setAttribute('checked', 'checked');
			ui.get('#dl-with-grabby')?.classList.add('disabled');
			ui.get('label[for=dl-with-grabby]')?.classList.add('disabled');
			ui.get('div#dm-list-container')?.classList.add('disabled');
		}

	}

	protected onActionClicked(clickedAction: Element)
	{
		let id = clickedAction.id;
		
		switch(id)
		{
			case "action-download":
				if( (ui.get("#dl-with-grabby") as HTMLInputElement).checked)
				{
					DownloadJob.getFromDownload(this.getSelectedDM(), this.download).then((job) => {
						let msg = new Messaging.MSGDownload(job);
						Messaging.sendMessage(msg);
					});
				}
				else{
					this.downloadWithBrowser();
				}
				break;
	
			case "action-back":
				(new ViewDownloadsList()).render();
				break;		
	
			default:
				break;
		}
	}

	private downloadWithBrowser()
	{
		browser.downloads.download({
			filename: this.download.filename,
			saveAs: true,
			url: this.download.url
		});
	}
}