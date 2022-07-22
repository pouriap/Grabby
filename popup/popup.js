document.addEventListener("DOMContentLoaded", (event) => {

	document.querySelectorAll(".action").forEach(function(action){
		action.addEventListener('click', (evt)=>{
			actionClicked(DLGPop.selectedDl, action);
		});
	});

	document.getElementById("dl-with-dlgrab").click();

	getBackgroundData().then(onBgDataRcvd);

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
		
		case "action-download":
			if(document.getElementById("dl-with-dlgrab").checked){
				downloadWithSelectedDM(selectedDl);
			}
			else{
				downloadWithFirefox(selectedDl);
			}
			break;

		case "action-back":
			showDownloadsList();
			break;

		case "action-clearList":
			clearDownloadsList();
			break;

		case "dl-with-dlgrab":
			document.getElementById("dm-list-container").classList.remove("disabled");
			break;

		case "dl-with-firefox":
			document.getElementById("dm-list-container").classList.add("disabled");
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
 * This is called when background data (DLG) is received via messaging
 */
function onBgDataRcvd() { 

	//populate list of downloads
	let keys = DLGPop.allDownloads.getKeys();
	//reverse to show latest downloads on top
	keys.reverse();

	populateDMs();

	for (const key of keys) {

		/**
		 * @type {Download}
		 */
		let download = DLGPop.allDownloads.get(key);

		if(download.hidden){
			continue;
		}

		if( 
			DLGPop.options.showOnlyTabDls &&
			download.tabId != DLGPop.currTabId && 
			Utils.getFullPath(download.tabUrl) != Utils.getFullPath(DLGPop.currTabUrl)
		){
			//log('hiding dl: ', download.url, ' because ', download.origin, ' =/= ', DLGPop.currTabUrl);
			continue;
		}

		let listItem = document.createElement("li");
		listItem.setAttribute("id", "req_" + download.requestId);
		listItem.setAttribute("class", "dl-item " + download.debug_gray);
		listItem.setAttribute("title", download.url);
		listItem.setAttribute("data-hash", key);
		let reason = (log.DEBUG)? " (" + download.classReason + ")" : "";

		//if it's a file download
		if(!download.manifest){
			listItem.innerHTML = download.getFilename() + reason;
		}
		else{
			listItem.innerHTML = download.manifest.title;
		}

		listItem.addEventListener("click", function(evt)
		{
			//todo: when you click a download and make some changes and then click another download 
			// the same changes are still there because it's the same page
			document.getElementById('action-report').setAttribute('class', 'action');
			document.getElementById('action-report').innerHTML = 'Report falsely detected download';

			let hash = this.getAttribute("data-hash");
			DLGPop.selectedDl = DLGPop.allDownloads.get(hash);
			log('item clicked: ', DLGPop.selectedDl);

			if(DLGPop.selectedDl.manifest){
				showStreamDetails(DLGPop.selectedDl);
			}
			else{
				showDownloadDetails(DLGPop.selectedDl);
			}
		});

		//this is for getting the info we put in tests
		if(log.DEBUG){
			listItem.addEventListener("contextmenu", function(evt){
				evt.preventDefault();
				let hash = this.getAttribute("data-hash");
				let dl = DLGPop.allDownloads.get(hash);
				let info = {};
				info.reqDetails = dl.reqDetails;
				info.resDetails = dl.resDetails;
				log(JSON.stringify(info).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
			});
		}

		document.getElementById("downloads-list").appendChild(listItem);

	}

}

/**
 * Shows the details popup for a particular download item
 * @param {Download} download 
 */
function showDownloadDetails(download)
{
	let dlList = document.querySelector("#downloads-list");
	let dlDetails = document.querySelector("#download-details");

	document.querySelector("#download-details #filename").innerHTML = download.getFilename();
	document.querySelector("#download-details #filename").setAttribute("title", download.getFilename());
	document.querySelector("#download-details #size").innerHTML = 
		(download.getSize() !== "unknown")? filesize(download.getSize()) : download.getSize();
	document.querySelector("#download-details #url").innerHTML = download.url;
	document.querySelector("#download-details #url").setAttribute("title", download.url);
	document.querySelector("#download-details #output").style.display = 'none';

	hideElement(dlList);
	showElement(dlDetails);
}

/**
 * Shows the details popup for a particular stream download
 * @param {Download} download 
 */
 function showStreamDetails(download)
 {
	let dlList = document.querySelector("#downloads-list");
	let strmDetails = document.querySelector("#stream-details");
	let manifest = download.manifest;

	let duration = Utils.formatSeconds(manifest.playlists[0].duration);
	document.querySelector("#stream-details #filename").innerHTML = manifest.title;
	document.querySelector("#stream-details #filename").setAttribute("title", manifest.title);
	document.querySelector("#stream-details #duration").innerHTML = duration;
	document.querySelector("#stream-details #duration").setAttribute("title", duration);

	hideElement(dlList);
	showElement(strmDetails);
}

/**
 * shows the list of all download items
 */
function showDownloadsList()
{
	let dlList = document.querySelector("#downloads-list");
	let dlDetails = document.querySelector("#download-details");
	let strmDetails = document.querySelector("#stream-details");
	hideElement(dlDetails);
	hideElement(strmDetails);
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
	Messaging.sendMessage(message);
}