var DEBUG = true;

/**
 * the Download object for the clicked link
 * @type {Download}
 */
var selectedDl = {};

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

	document.getElementById("action-back").addEventListener("click", function(evt){
		showDownloadsList();
	});

	document.getElementById("action-clearList").addEventListener("click", function(evt){
		clearDownloadsList();
	});

	getBackgroundData().then(onGot);

});

function onGot(data) { 

	appJSON = data.appJSON;
	let allDownloads = data.allDownloads;

	//populate list of downloads
	let keys = allDownloads.getKeys();
	//reverse to show latest downloads on top
	keys.reverse();

	for (const key of keys) {

		let download = allDownloads.get(key);

		let listItem = document.createElement("li");
		listItem.setAttribute("id", "req_" + download.requestId);
		listItem.setAttribute("class", "dl-item " + download.debug_gray);
		listItem.setAttribute("title", download.url);
		listItem.setAttribute("data-hash", key);
		let reason = (DEBUG)? " (" + download.grabReason + ")" : "";
		listItem.innerHTML = download.getFilename() + reason;

		listItem.addEventListener("click", function(evt){
			let hash = this.getAttribute("data-hash");
			selectedDl = allDownloads.get(hash);
			console.log('item clicked: ', selectedDl);
			showDownloadDetails(selectedDl);
		});

		document.getElementById("downloads-list").appendChild(listItem);

	}

	//enable/disable IDM download
	setActionEnabled(document.getElementById('action-idm'), appJSON.runtime.idmAvailable);

}

/**
 * Shows the details popup for a particular download item
 * @param {Download} download 
 */
function showDownloadDetails(download){
	let dlList = document.getElementById("downloads-list");
	let actionList = document.getElementById("download-details");
	document.getElementById("filename").innerHTML = download.getFilename();
	document.getElementById("filename").setAttribute("title", download.getFilename());
	document.getElementById("size").innerHTML = 
		(download.getSize() !== "unknown")? filesize(download.getSize()) : download.getSize();
	document.getElementById("host").innerHTML = download.getHost();
	document.getElementById("time").innerHTML = 
		(new Date(download.time)).toLocaleString("en-US", constants.dateForamt);
	document.getElementById("url").innerHTML = download.url;
	document.getElementById("url").setAttribute("title", download.url);
	document.getElementById("origin").innerHTML = download.origin;
	document.getElementById("origin").setAttribute("title", download.origin);
	document.getElementById("output").style.display = 'none';
	hideElement(dlList);
	showElement(actionList);
}

/**
 * shows the list of all download items
 */
function showDownloadsList(){
	let dlList = document.getElementById("downloads-list");
	let actionList = document.getElementById("download-details");
	hideElement(actionList);
	showElement(dlList);
}

/**
 * clears list of all download items
 */
function clearDownloadsList(){
	document.querySelectorAll(".dl-item").forEach((element)=>{
        element.parentElement.removeChild(element);
	});
	let message = {type: 'clear_list'};
	browser.runtime.sendMessage(message);
}