var DEBUG = true;

/**
 * @type {DlGrabApp}
 */
var app;

/**
 * @type {Download}
 */
var selectedDl = {};

//TODO:  getBackgroundPage() doesn't work in private window https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getBackgroundPage

document.addEventListener("DOMContentLoaded", (event) => {

	document.getElementById("action-back").addEventListener("click", function(evt){
		showDownloadsList();
	});

	document.getElementById("action-clearList").addEventListener("click", function(evt){
		clearDownloadsList();
	});
	
	document.getElementById("action-copy").addEventListener("click", function(evt){
		copyLinkToClipboard(selectedDl);
	});

	document.getElementById("action-firefox").addEventListener("click", function(evt){
		downloadWithFirefox(selectedDl);
	});

	document.getElementById("action-idm").addEventListener("click", function(evt){
		downloadWithIDM(selectedDl);
	});

	document.getElementById("action-curl").addEventListener("click", function(evt){
		copyCurlCommand(selectedDl);
	});

	document.getElementById("action-wget").addEventListener("click", function(evt){
		copyWgetCommand(selectedDl);
	});

	var getting = browser.runtime.getBackgroundPage();
	getting.then(onGot, onError);

});

function onGot(page) { 

	app = page.app;
	let allDownloads = app.allDownloads;

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
		let reason = (DEBUG)? " (" + download.debug_reason + ")" : "";
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
	if(page.app.runtime.idmAvailable){
		document.getElementById('action-idm').classList.remove("disabled-action");
		document.getElementById('action-idm').removeAttribute("title");
	}
	else{
		document.getElementById('action-idm').classList.add("disabled-action");
		document.getElementById('action-idm').setAttribute("title", "Cannot communicate with IDM");
	}

}

function onError(error) {
	console.log(`Error getting data from background: ${error}`);
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