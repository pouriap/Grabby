namespace PopupDownload
{
	var selectedDl: Download;
	var GBPop: GrabbyPopup;
	// indicates whether we continue with browser after download dialog is closed or not
	var continueWithBrowser = false;

	document.addEventListener("DOMContentLoaded", (event) => {

		document.querySelectorAll(".action").forEach(function(action){
			action.addEventListener('click', (evt)=>{
				actionClicked(action);
			});
		});

		VUtils.getBackgroundData().then(async function(gb)
		{
			GBPop = gb;
			let window = await browser.windows.getCurrent({populate: true});
			let url = window.tabs[0].url;
			//get the hash of the download which was added to the URL when this windows was created
			let hash = url.substring(url.indexOf("?dlHash=") + 8);
			selectedDl = GBPop.allDownloads.get(hash)!;
			renderDownloadDialog();
		});

	});

	/**
	 * This is called every time something with '.action' class is clicked in a popup dialog
	 */
	function actionClicked(clickedAction: Element)
	{
		let id = clickedAction.id;
		let disabled = clickedAction.getAttribute("class")?.indexOf("disabled-action") !== -1;

		if(disabled){
			return;
		}

		switch(id)
		{	
			case "action-continue":
				continueWithBrowser = true;
				window.close();		
				break;

			case "action-download":
				VUtils.downloadWithSelectedDM(selectedDl);
				break;
			
			case "action-cancel":
				window.close();
				break;

			default:
				break;
		}
	}

	/**
	 * Sends a message to background to tell it the download dialog is closing
	 */
	window.addEventListener("beforeunload", function()
	{
		let msg = new Messaging.MSGDlDialogClosing(continueWithBrowser, selectedDl.hash);
		Messaging.sendMessage(msg);
	});

	/**
	 * This is called when background data (GB) is received via messaging
	 */
	function renderDownloadDialog()
	{
		let download = selectedDl;
		let classReason = (log.DEBUG)? ' (' + download.classReason + ')' : '';
		ui.get("#filename")!.innerHTML = download.filename + classReason;
		ui.get("#filename")!.setAttribute("title", download.filename);
		ui.get("#size")!.innerHTML = (download.size !== -1)? filesize(download.size) : download.size;
		ui.get("#host")!.innerHTML = download.host;
		VUtils.populateDMs();
	}

}