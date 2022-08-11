/**
 * id of this download dialog
 * used for closing blank tabs after a download dialog is closed
 */
var windowId: number;

document.addEventListener("DOMContentLoaded", (event) => {

	document.querySelectorAll(".action").forEach(function(action){
		action.addEventListener('click', (evt)=>{
			// @ts-ignore	//ignore duplicate declaration
			actionClicked(DLGPop.selectedDl, action);
		});
	});

	getBackgroundData().then(async function(){
		windowId = (await browser.windows.getCurrent()).id;
		let hash = DLGPop.downloadDialogs.get(windowId)!;
		DLGPop.selectedDl = DLGPop.allDownloads.get(hash)!;
		onBgDataRcvd();
	});

});

/**
 * This is called every time something with '.action' class is clicked in a popup dialog
 */
// @ts-ignore	//ignore duplicate declaration
function actionClicked(selectedDl: Download, clickedAction: Element)
{
	let id = clickedAction.id;
	let disabled = clickedAction.getAttribute("class")?.indexOf("disabled-action") !== -1;

	if(disabled){
		return;
	}

	switch(id){
		
		case "action-continue":
			continueWithBrowser(selectedDl);
			break;

		case "action-download":
			if( (document.getElementById("dl-with-dlgrab") as HTMLInputElement).checked){
				downloadWithSelectedDM(selectedDl);
			}
			else{
				downloadWithFirefox(selectedDl);
			}
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
	if(!DLGPop.selectedDl)
	{
		log.err('No download is selected');
	}

	let msg = new Messaging.MSGDlDialogClosing(DLGPop.continueWithBrowser, 
		DLGPop.selectedDl.hash, windowId);
	Messaging.sendMessage(msg);
});

/**
 * This is called when background data (DLG) is received via messaging
 */
// @ts-ignore	//ignore duplicate declaration
function onBgDataRcvd()
{
	if(!DLGPop.selectedDl)
	{
		log.err('No download is selected');
	}

	let classReason = (log.DEBUG)? ' (' + DLGPop.selectedDl.classReason + ')' : '';
	document.getElementById("filename")!.innerHTML = DLGPop.selectedDl.filename + classReason;
	document.getElementById("filename")!.setAttribute("title", DLGPop.selectedDl.filename);
	document.getElementById("size")!.innerHTML = 
		(DLGPop.selectedDl.size !== -1)? filesize(DLGPop.selectedDl.size) : DLGPop.selectedDl.size;
	document.getElementById("host")!.innerHTML = DLGPop.selectedDl.host;
	populateDMs();
}
