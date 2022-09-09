namespace PopupDownload
{
	// indicates whether we continue with browser after download dialog is closed or not
	export var continueWithBrowser = false;

	/**
	 * id of this download dialog
	 * used for closing blank tabs after a download dialog is closed
	 */
	var windowId: number;

	document.addEventListener("DOMContentLoaded", (event) => {

		document.querySelectorAll(".action").forEach(function(action){
			action.addEventListener('click', (evt)=>{
				actionClicked(action);
			});
		});

		Popup.getBackgroundData().then(async function(){
			windowId = (await browser.windows.getCurrent()).id;
			let hash = DLGPop.downloadDialogs.get(windowId)!;
			Popup.selectedDl = DLGPop.allDownloads.get(hash)!;
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
		let selectedDl = Popup.selectedDl;

		if(disabled){
			return;
		}

		switch(id)
		{	
			case "action-continue":
				Popup.continueWithBrowser();
				break;

			case "action-download":
				Popup.downloadWithSelectedDM(selectedDl);
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
		let msg = new Messaging.MSGDlDialogClosing(continueWithBrowser, Popup.selectedDl.hash, 
			windowId);
		Messaging.sendMessage(msg);
	});

	/**
	 * This is called when background data (DLG) is received via messaging
	 */
	function renderDownloadDialog()
	{
		let download = Popup.selectedDl;
		let classReason = (log.DEBUG)? ' (' + download.classReason + ')' : '';
		ui.get("#filename")!.innerHTML = download.filename + classReason;
		ui.get("#filename")!.setAttribute("title", download.filename);
		ui.get("#size")!.innerHTML = (download.size !== -1)? filesize(download.size) : download.size;
		ui.get("#host")!.innerHTML = download.host;
		Popup.populateDMs();
	}

}