var DEBUG = true;

/**
 * id of this download dialog
 * used for closing blank tabs after a download dialog is closed
 */
var windowId;

document.addEventListener("DOMContentLoaded", (event) => {

	document.querySelectorAll(".action").forEach(function(action){
		action.addEventListener('click', (evt)=>{
			actionClicked(popupContext.selectedDl, action);
		});
	});

	getBackgroundData().then(async function(){
		windowId = (await browser.windows.getCurrent()).id;
		let hash = popupContext.appJSON.downloadDialogs[windowId];
		popupContext.selectedDl = popupContext.allDownloads.get(hash);
		onGot();
	});

});

//note that closing tab also cancels the download
window.addEventListener("beforeunload", async function() {
	let downloadPageTabId = popupContext.selectedDl.reqDetails.tabId;
	let message = {
		type: 'dl_dialog_closing', 
		windowId: windowId, 
		downloadPageTabId: downloadPageTabId,
		continueWithBrowser: popupContext.continueWithBrowser
	};
	browser.runtime.sendMessage(message);
});

function onGot() { 

	//enable/disable IDM download
	setActionEnabled(document.getElementById('action-idm'), popupContext.appJSON.runtime.idmAvailable);

	document.getElementById("filename").innerHTML = popupContext.selectedDl.getFilename();
	document.getElementById("filename").setAttribute("title", popupContext.selectedDl.getFilename());
	document.getElementById("size").innerHTML = 
		(popupContext.selectedDl.getSize() !== "unknown")? filesize(popupContext.selectedDl.getSize()) : popupContext.selectedDl.getSize();
	document.getElementById("url").innerHTML = popupContext.selectedDl.url;
	document.getElementById("url").setAttribute("title", popupContext.selectedDl.url);
	document.getElementById("origin").innerHTML = popupContext.selectedDl.origin;
	document.getElementById("origin").setAttribute("title", popupContext.selectedDl.origin);
	document.getElementById("output").style.display = 'none';

}

//todo: replicate accept-ranges request headers

function onError(error) {
	console.log(`Error getting data from background: ${error}`);
}

