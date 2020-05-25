var popupContext = {};
/**
 * @type {FixedSizeMap}
 */
popupContext.allDownloads = null;
/**
 * the Download object for the clicked link
 * @type {Download}
 */
popupContext.selectedDl = null;
/**
 * a JSON serialized instance of global 'app' we got through messaging
 */
popupContext.appJSON = null;
/**
 * wheter this download was intercepted by Download Grab
 * @type {boolean}
 */
popupContext.continueWithBrowser = false;

/**
 * @returns {Promise} a promise resolved with a FixedSizeMap of all downloads
 */
async function getBackgroundData(){

	let message = {type: DG.Messaging.TYP_GET_BG_DATA};
	let response = await browser.runtime.sendMessage(message);
	let limit = response.downloads.limit;
	let allDlsJSON = response.downloads.list;
	let allDownloads = new FixedSizeMap(limit);

	//populate our local version of allDownloads using the JSON data
	Object.keys(allDlsJSON).forEach(function(downloadHash){
		let downloadJSON = allDlsJSON[downloadHash];
		reqDetails = downloadJSON.reqDetails;
		resDetails = downloadJSON.resDetails;
		let download = new Download(reqDetails, resDetails);
		download.grabReason = downloadJSON.grabReason;
		download.reported = downloadJSON.reported;
		download.action = downloadJSON.act;
		download.category = downloadJSON.cat;
		download.hash = downloadJSON.hash;
		allDownloads.put(downloadHash, download);
	});

	popupContext.appJSON = response.appJSON;
	popupContext.allDownloads = allDownloads;

	return Promise.resolve();
}

/**
 * 
 * @param {Download} selectedDl 
 * @param {Element} clickedAction 
 */
function actionClicked(selectedDl, clickedAction){

	let id = clickedAction.id;
	let disabled = clickedAction.getAttribute("class").indexOf("disabled-action") !== -1;

	if(disabled){
		return;
	}

	switch(id){
		
		case "action-continue":
			continueWithBrowser(selectedDl);
			break;

		case "action-download":
			download(selectedDl);
			break;
		
		case "action-cancel":
			window.close();
			break;

		case "action-report":
			let source = (window.location.href.indexOf("popup.html") !== -1)? "popup dialog" : "download dialog";
			reportDownload(selectedDl, source);
			break;

		default:
			break;
		
	}

}

function populateDMs(){
	let availableDMs = popupContext.appJSON.runtime.availableDMs;
	let dmsDropDown = document.getElementById('available-dms');
	for(let dmName of availableDMs){
		let option = document.createElement('option');
		option.value = dmName;
		option.innerHTML = dmName;
		option.id = dmName;
		dmsDropDown.appendChild(option);
	}
	let defaultDM = popupContext.appJSON.options.defaultDM || availableDMs[0];
	if(defaultDM){
		console.log('setting default dm: ', defaultDM);
		document.getElementById(defaultDM).setAttribute('selected', 'selected');
	}
}


/**
 * @param {Download} download 
 */
function download(download){
	if(document.getElementById("dl-with-dlgrab").checked){
		downloadWithSelectedDM(download);
	}
	else if(document.getElementById("dl-with-firefox")
		&& document.getElementById("dl-with-firefox").checked){

		downloadWithFirefox(download);
	}
	else if(document.getElementById("continue-with-firefox")
		&& document.getElementById("continue-with-firefox").checked){

		continueWithBrowser(download);
	}
}

/**
 * @param {Download} download 
 */
function downloadWithSelectedDM(download){
	let DMs = document.getElementById('available-dms');
	let selectedDM = DMs.options[DMs.selectedIndex].value;
	let message = {
		type: DG.Messaging.TYP_DOWNLOAD, 
		downloadHash: download.getHash(), 
		dmName: selectedDM
	};
	browser.runtime.sendMessage(message);
	window.close();
}

/**
 * @param {Download} download 
 */
function continueWithBrowser(download){
	let message = {type: DG.Messaging.TYP_CONT_WITH_BROWSER, downloadHash: download.hash};
	browser.runtime.sendMessage(message);
	popupContext.continueWithBrowser = true;
	window.close();
}

/**
 * @param {Download} download 
 */
function downloadWithFirefox(download) {
	browser.downloads.download({
		filename: download.getFilename(),
		saveAs: true,
		url: download.url
	});
}

/**
 * @param {Download} download 
 */
function reportDownload(download, source){

	setActionEnabled(document.getElementById("action-report"), false);

	//don't allow report if already reported
	if(download.reported){
		document.getElementById("action-report").innerHTML = "Already reported";
		return;
	}

	//don't allow reports from private windows because privacy
	if(download.reqDetails.incognito){
		document.getElementById("action-report").innerHTML = "Report not enabled in private browsing";
		return;
	}

	let reportData = JSON.parse(JSON.stringify(download.resDetails));

	//remove stuff we don't need
	delete reportData.cookieStoreId;
	delete reportData.ip;
	delete reportData.proxyInfo;

	//add stuff we need
	//we add these so they'll show in the beggining when I'm vewing them hehe
	reportData._grabReason = download.grabReason;
	reportData._options = popupContext.appJSON.options;
	reportData._reportSource = source;

	//stringify
	reportData = JSON.stringify(reportData);
	//base64 encode
	reportData = btoa(reportData);
	//URI encode
	reportData = encodeURIComponent(reportData);
	let postData = `data=${reportData}`;
	//this is my own website
	//the only things that are stored are the base64 encoded reportData and time of report
	let url = "https://dlgrab.my.to/report.php";
	_sendPOSTRequest(url, postData);

	function _sendPOSTRequest(url, postData){

		document.getElementById('spinner').style.display = 'inline-block';

		var xhr = new XMLHttpRequest();
		xhr.open("POST", url, true);
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

		xhr.onreadystatechange = function() {
			//we only want the DONE state
			if(xhr.readyState != XMLHttpRequest.DONE){
				return;
			}
			document.getElementById('spinner').style.display = 'none';
			if(xhr.status == 200) {
				document.getElementById("action-report").innerHTML = "Report submitted. Thank you.";
				document.getElementById("action-report").classList.add("success");
				//for popup context downloads
				download.reported = true;
				//for bg context downloads
				let message = {type: DG.Messaging.TYP_DL_REPORTED, downloadHash: download.getHash()};
				browser.runtime.sendMessage(message);
			}
			else{
				console.log("READ STATE CHANGED TO: ", xhr.readyState);
				document.getElementById("action-report").innerHTML = "Failed to submit error.";
				document.getElementById("action-report").classList.add("fail");
				setActionEnabled(document.getElementById("action-report"), true);
			}
		}

		xhr.send(postData);
	}

}

function hideElement(element){
	element.classList.add("hidden");
}

function showElement(element){
	element.classList.remove("hidden");
}

/**
 * @param {Element} element 
 * @param {boolean} enabled 
 */
function setActionEnabled(element, enabled){
	if(enabled){
		element.classList.remove("disabled-action");
	}
	else{
		element.classList.add("disabled-action");
	}
}