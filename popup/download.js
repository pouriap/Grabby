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

	document.getElementById("dl-with-dlgrab").addEventListener("click", function(evt){
		document.getElementById("dm-list-container").classList.remove("disabled");
	});

	document.getElementById("continue-with-firefox").addEventListener("click", function(evt){
		document.getElementById("dm-list-container").classList.add("disabled");
	});

	document.getElementById("dl-with-dlgrab").click();

	getBackgroundData().then(async function(){
		windowId = (await browser.windows.getCurrent()).id;
		let hash = popupContext.appJSON.downloadDialogs[windowId];
		popupContext.selectedDl = popupContext.allDownloads.get(hash);
		onGot();
	});

});

window.addEventListener("beforeunload", function() {
	let downloadPageTabId = popupContext.selectedDl.reqDetails.tabId;
	let message = {
		type: Messaging.TYP_DL_DIALOG_CLOSING, 
		windowId: windowId, 
		downloadPageTabId: downloadPageTabId,
		downloadHash: popupContext.selectedDl.getHash(),
		continueWithBrowser: popupContext.continueWithBrowser
	};
	browser.runtime.sendMessage(message);
});

function onGot() { 
	let grabReason = (DEBUG)? ' ('+popupContext.selectedDl.grabReason+')' : '';
	document.getElementById("filename").innerHTML = popupContext.selectedDl.getFilename() + grabReason;
	document.getElementById("filename").setAttribute("title", popupContext.selectedDl.getFilename());
	document.getElementById("size").innerHTML = 
		(popupContext.selectedDl.getSize() !== "unknown")? filesize(popupContext.selectedDl.getSize()) : popupContext.selectedDl.getSize();
	document.getElementById("host").innerHTML = popupContext.selectedDl.getHost();
	document.getElementById("output").style.display = 'none';
	populateDMs();
}
