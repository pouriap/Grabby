class DownloadView extends View
{
	//@ts-ignore
	selectedDl: GrabbedDownload;
	// indicates whether we continue with browser after download dialog is closed or not
	continueWithBrowser = false;

	async doRender()
	{
		/**
		 * Sends a message to background to tell it the download dialog is closing
		 */
		window.addEventListener("beforeunload", () =>
		{
			let msg = new Messaging.MSGDlDialogClosing(this.continueWithBrowser, this.selectedDl.hash);
			Messaging.sendMessage(msg);
		});

		let _window = await browser.windows.getCurrent({populate: true});
		let url = _window.tabs[0].url;
		//get the hash of the download which was added to the URL when this windows was created
		let hash = url.substring(url.indexOf("?dlHash=") + 8);
		this.selectedDl = this.GBPop.allDownloads.get(hash)!;
		this.renderDownloadDialog();
	}

	/**
	 * This is called every time something with '.action' class is clicked in a popup dialog
	 */
	onActionClicked(clickedAction: Element)
	{
		let id = clickedAction.id;
		let disabled = clickedAction.getAttribute("class")?.indexOf("disabled-action") !== -1;

		if(disabled){
			return;
		}

		switch(id)
		{	
			case "action-continue":
				this.continueWithBrowser = true;
				window.close();		
				break;

			case "action-download":
				DownloadJob.getFromDownload(this.getSelectedDM(), this.selectedDl).then((job) => {
					let msg = new Messaging.MSGDownload(job);
					Messaging.sendMessage(msg);
					window.close();
				});
				break;
			
			case "action-cancel":
				window.close();
				break;

			default:
				break;
		}
	}

	/**
	 * This is called when background data (GB) is received via messaging
	 */
	renderDownloadDialog()
	{
		let download = this.selectedDl;
		ui.get("#filename")!.innerHTML = download.filename;
		ui.get("#filename")!.setAttribute("title", download.filename);
		ui.get("#size")!.innerHTML = (download.size)? filesize(download.size) : 'unknown';
		ui.get("#host")!.innerHTML = download.host;
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

}

document.addEventListener("DOMContentLoaded", (e) => {
	(new DownloadView()).render();
});