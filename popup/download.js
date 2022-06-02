var DEBUG = true;

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

	document.getElementById("dl-with-dlgrab").addEventListener("click", function(evt){
		document.getElementById("dm-list-container").classList.remove("disabled");
	});

	document.getElementById("continue-with-firefox").addEventListener("click", function(evt){
		document.getElementById("dm-list-container").classList.add("disabled");
	});

	document.getElementById("dl-with-dlgrab").click();

	getBackgroundData().then(async function(){
		windowId = (await browser.windows.getCurrent()).id;
		let hash = DLGPop.downloadDialogs[windowId];
		DLGPop.selectedDl = DLGPop.allDownloads.get(hash);
		onGot();
	});

});

window.addEventListener("beforeunload", function() {
	let downloadPageTabId = DLGPop.selectedDl.reqDetails.tabId;
	let message = {
		type: Messaging.TYP_DL_DIALOG_CLOSING, 
		windowId: windowId, 
		downloadPageTabId: downloadPageTabId,
		downloadHash: DLGPop.selectedDl.getHash(),
		continueWithBrowser: DLGPop.continueWithBrowser
	};
	browser.runtime.sendMessage(message);
});

function onGot() { 
	let classReason = (DEBUG)? ' ('+DLGPop.selectedDl.classReason+')' : '';
	document.getElementById("filename").innerHTML = DLGPop.selectedDl.getFilename() + classReason;
	document.getElementById("filename").setAttribute("title", DLGPop.selectedDl.getFilename());
	document.getElementById("size").innerHTML = 
		(DLGPop.selectedDl.getSize() !== "unknown")? filesize(DLGPop.selectedDl.getSize()) : DLGPop.selectedDl.getSize();
	document.getElementById("host").innerHTML = DLGPop.selectedDl.getHost();
	document.getElementById("output").style.display = 'none';
	populateDMs();
}
