/**
 * id of this download dialog
 * used for closing blank tabs after a download dialog is closed
 */
var windowId;

document.addEventListener("DOMContentLoaded", (event) => {

	document.querySelectorAll(".action").forEach(function(action){
		action.addEventListener('click', (evt)=>{
			actionClicked(DLGPop.selectedDl, action);
		});
	});

	getBackgroundData().then(async function(){
		windowId = (await browser.windows.getCurrent()).id;
		let hash = DLGPop.downloadDialogs[windowId];
		DLGPop.selectedDl = DLGPop.allDownloads.get(hash);
		onBgDataRcvd();
	});

});

/**
 * This is called every time something with '.action' class is clicked in a popup dialog
 * @param {Download} selectedDl 
 * @param {Element} clickedAction 
 */
function actionClicked(selectedDl, clickedAction)
{
	let id = clickedAction.id;
	let disabled = clickedAction.getAttribute("class").indexOf("disabled-action") !== -1;

	if(disabled){
		return;
	}

	switch(id){
		
		case "action-continue":
			continueWithBrowser(selectedDl);
			break;

		case "action-download":
			if(document.getElementById("dl-with-dlgrab").checked){
				downloadWithSelectedDM(selectedDl);
			}
			else{
				downloadWithFirefox(selectedDl);
			}
			break;
		
		case "action-cancel":
			window.close();
			break;

		case "action-report":
			let source = (window.location.href.indexOf("popup.html") !== -1)? "popup dialog" : "download dialog";
			reportDownload(selectedDl, source);
			break;

		default:
			break;
	}
}

/**
 * Sends a message to background to tell it the download dialog is closing
 */
window.addEventListener("beforeunload", function() {
	let message = {
		type: Messaging.TYP_DL_DIALOG_CLOSING, 
		windowId: windowId, 
		downloadHash: DLGPop.selectedDl.hash,
		continueWithBrowser: DLGPop.continueWithBrowser
	};
	Messaging.sendMessage(message);
});

/**
 * This is called when background data (DLG) is received via messaging
 */
function onBgDataRcvd() { 
	let classReason = (log.DEBUG)? ' ('+DLGPop.selectedDl.classReason+')' : '';
	document.getElementById("filename").innerHTML = DLGPop.selectedDl.getFilename() + classReason;
	document.getElementById("filename").setAttribute("title", DLGPop.selectedDl.getFilename());
	document.getElementById("size").innerHTML = 
		(DLGPop.selectedDl.getSize() !== "unknown")? filesize(DLGPop.selectedDl.getSize()) : DLGPop.selectedDl.getSize();
	document.getElementById("host").innerHTML = DLGPop.selectedDl.getHost();
	populateDMs();
}
