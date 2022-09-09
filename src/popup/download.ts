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
		let classReason = (log.DEBUG)? ' (' + Popup.selectedDl.classReason + ')' : '';
		document.getElementById("filename")!.innerHTML = Popup.selectedDl.filename + classReason;
		document.getElementById("filename")!.setAttribute("title", Popup.selectedDl.filename);
		document.getElementById("size")!.innerHTML = 
			(Popup.selectedDl.size !== -1)? filesize(Popup.selectedDl.size) : Popup.selectedDl.size;
		document.getElementById("host")!.innerHTML = Popup.selectedDl.host;
		Popup.populateDMs();
	}

}