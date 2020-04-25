var DEBUG = true;

/**
 * the Download object for the clicked link
 * @type {Download}
 */
var selectedDl = {};

/**
 * id of this download dialog
 * used for closing blank tabs after a download dialog is closed
 */
var windowId;

/**
 * a JSON serialized instance of global 'app' we got through messaging
 */
var appJSON;

document.addEventListener("DOMContentLoaded", (event) => {

	document.querySelectorAll(".action").forEach(function(action){
		action.addEventListener('click', (evt)=>{
			actionClicked(selectedDl, action);
		});
	});

	getBackgroundData().then(async function(data){
		appJSON = data.appJSON;
		let allDownloads = data.allDownloads;
		windowId = (await browser.windows.getCurrent()).id;
		let hash = appJSON.downloadDialogs[windowId];
		selectedDl = allDownloads.get(hash);
		onGot();
	});

});

window.addEventListener("beforeunload", async function() {
	let downloadPageTabId = selectedDl.reqDetails.tabId;
	let message = {type: 'dl_dialog_closing', windowId: windowId, downloadPageTabId: downloadPageTabId};
	browser.runtime.sendMessage(message);
});

function onGot() { 

	//enable/disable IDM download
	setActionEnabled(document.getElementById('action-idm'), appJSON.runtime.idmAvailable);

	document.getElementById("filename").innerHTML = selectedDl.getFilename();
	document.getElementById("filename").setAttribute("title", selectedDl.getFilename());
	document.getElementById("size").innerHTML = 
		(selectedDl.getSize() !== "unknown")? filesize(selectedDl.getSize()) : selectedDl.getSize();
	document.getElementById("url").innerHTML = selectedDl.url;
	document.getElementById("url").setAttribute("title", selectedDl.url);
	document.getElementById("origin").innerHTML = selectedDl.origin;
	document.getElementById("origin").setAttribute("title", selectedDl.origin);
	document.getElementById("output").style.display = 'none';

}

//todo: replicate accept-ranges request headers

function onError(error) {
	console.log(`Error getting data from background: ${error}`);
}

