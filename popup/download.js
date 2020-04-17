var DEBUG = true;

/**
 * @type {DlGrabApp}
 */
var app;

/**
 * @type {Download}
 */
var selectedDl = {};

var windowId;
var downloadHash;

document.addEventListener("DOMContentLoaded", (event) => {

	document.querySelectorAll(".action").forEach(function(action){
		action.addEventListener('click', (evt)=>{
			actionClicked(selectedDl, action);
		});
	});

	browser.windows.getCurrent().then((windowInfo)=>{
		windowId = windowInfo.id;
		let message = {type: 'dl_dialog_populate_request', windowId: windowId};
		let sending = browser.runtime.sendMessage(message);
		sending.then((response)=>{
			downloadHash = response.downloadHash;
			var getting = browser.runtime.getBackgroundPage();
			getting.then(onGot, onError);
		});
	});

});

//todo: add report button 
window.addEventListener("beforeunload", (event) => {
	let downloadPageTabId = selectedDl.req_details.tabId;
	let message = {type: 'dl_dialog_closing', windowId: windowId, downloadPageTabId: downloadPageTabId};
	browser.runtime.sendMessage(message);
});

function onGot(page) { 

	app = page.app;
	selectedDl = app.allDownloads.get(downloadHash);

	//enable/disable IDM download
	setActionEnabled(document.getElementById('action-idm'), page.app.runtime.idmAvailable);

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
//todo: put all these in the same file

function onError(error) {
	console.log(`Error getting data from background: ${error}`);
}

