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
			Utils.getCleanUrl(download.tabUrl) != Utils.getCleanUrl(DLGPop.currTabUrl)
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
		if(!download.streamInfo){
			listItem.innerHTML = download.getFilename() + reason;
		}
		else{
			listItem.innerHTML = download.streamInfo.title;
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

			if(DLGPop.selectedDl.streamInfo){
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
	let dlList = document.getElementById("downloads-list");
	let dlDetails = document.getElementById("download-details");

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
	showElement(dlDetails);
}

/**
 * Shows the details popup for a particular stream download
 * @param {Download} download 
 */
 function showStreamDetails(download)
 {
	let dlList = document.getElementById("downloads-list");
	let dlDetails = document.getElementById("download-details");
	let info = download.streamInfo;

	document.getElementById("filename").innerHTML = info.title;
	document.getElementById("filename").setAttribute("title", info.filename);
	document.getElementById("host").innerHTML = Utils.getDomain(download.origin);
	document.getElementById("time").innerHTML = 
		(new Date(download.time)).toLocaleString("en-US", constants.dateForamt);
	document.getElementById("url").innerHTML = download.url;
	document.getElementById("origin").innerHTML = download.origin;
	document.getElementById("origin").setAttribute("title", download.origin);
	document.getElementById("output").style.display = 'none';

	hideElement(dlList);
	showElement(dlDetails);
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
	Messaging.sendMessage(message);
}