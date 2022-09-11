namespace PopupDownload
{
	// indicates whether we continue with browser after download dialog is closed or not
	export var continueWithBrowser = false;

	/**
	 * id of this download dialog
	 * used for closing blank tabs after a download dialog is closed
	 */

	document.addEventListener("DOMContentLoaded", (event) => {

		document.querySelectorAll(".action").forEach(function(action){
			action.addEventListener('click', (evt)=>{
				actionClicked(action);
			});
		});

		Popup.getBackgroundData().then(async function(){
			let window = await browser.windows.getCurrent({populate: true});
			let url = window.tabs[0].url;
			//get the hash of the download which was added to the URL when this windows was created
			let hash = url.substring(url.indexOf("?dlHash=") + 8);
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
		let msg = new Messaging.MSGDlDialogClosing(continueWithBrowser, Popup.selectedDl.hash);
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