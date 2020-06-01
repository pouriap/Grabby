var DEBUG = true;

document.addEventListener("DOMContentLoaded", (event) => {

	document.querySelectorAll(".action").forEach(function(action){
		action.addEventListener('click', (evt)=>{
			actionClicked(popupContext.selectedDl, action);
		});
	});

	document.getElementById("action-back").addEventListener("click", function(evt){
		showDownloadsList();
	});

	document.getElementById("action-clearList").addEventListener("click", function(evt){
		clearDownloadsList();
	});

	document.getElementById("dl-with-dlgrab").addEventListener("click", function(evt){
		document.getElementById("dm-list-container").classList.remove("disabled");
	});

	document.getElementById("dl-with-firefox").addEventListener("click", function(evt){
		document.getElementById("dm-list-container").classList.add("disabled");
	});

	document.getElementById("dl-with-dlgrab").click();

	getBackgroundData().then(onGot);

});

function onGot() { 

	//populate list of downloads
	let keys = popupContext.allDownloads.getKeys();
	//reverse to show latest downloads on top
	keys.reverse();

	populateDMs();

	for (const key of keys) {

		let download = popupContext.allDownloads.get(key);

		let listItem = document.createElement("li");
		listItem.setAttribute("id", "req_" + download.requestId);
		listItem.setAttribute("class", "dl-item " + download.debug_gray);
		listItem.setAttribute("title", download.url);
		listItem.setAttribute("data-hash", key);
		let reason = (DEBUG)? " (" + download.classReason + ")" : "";
		listItem.innerHTML = download.getFilename() + reason;

		listItem.addEventListener("click", function(evt){

			//todo: when you click a download and make some changes and then click another download 
			// the same changes are still there because it's the same page
			document.getElementById('action-report').setAttribute('class', 'action');
			document.getElementById('action-report').innerHTML = 'Report falsely detected download';

			let hash = this.getAttribute("data-hash");
			popupContext.selectedDl = popupContext.allDownloads.get(hash);
			console.log('item clicked: ', popupContext.selectedDl);
			showDownloadDetails(popupContext.selectedDl);
		});

		document.getElementById("downloads-list").appendChild(listItem);

	}

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
	let message = {type: Messaging.TYP_CLEAR_LIST};
	browser.runtime.sendMessage(message);
}