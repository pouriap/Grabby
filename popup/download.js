var DEBUG = true;

/**
 * @type {Download}
 */
var selectedDl = {};

var windowId;

document.addEventListener("DOMContentLoaded", (event) => {

	document.querySelectorAll(".action").forEach(function(action){
		action.addEventListener('click', (evt)=>{
			actionClicked(selectedDl, action);
		});
	});

	globalizeApp().then(async function(){
		windowId = (await browser.windows.getCurrent()).id;
		let hash = app.downloadDialogs[windowId];
		selectedDl = app.allDownloads.get(hash);
		onGot();
	});

});

//todo: add report button 
window.addEventListener("beforeunload", async function() {
	let downloadPageTabId = selectedDl.reqDetails.tabId;
	let message = {type: 'dl_dialog_closing', windowId: windowId, downloadPageTabId: downloadPageTabId};
	browser.runtime.sendMessage(message);
});

function onGot() { 

	//enable/disable IDM download
	setActionEnabled(document.getElementById('action-idm'), app.runtime.idmAvailable);

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

