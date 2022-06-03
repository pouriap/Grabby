var DLGPop = new DownloadGrabPopup();

/**
 * Gets the DLG instance from the background script and makes a copy of the needed data inside it
 */
async function getBackgroundData()
{
	let message = {type: Messaging.TYP_GET_DLG};
	let response = await browser.runtime.sendMessage(message);
	let limit = response.DLGJSON.allDownloads.limit;
	let allDlsJSON = response.DLGJSON.allDownloads.list;
	let allDownloads = new FixedSizeMap(limit);

	//populate our local version of allDownloads using the JSON data
	for(let downloadHash of Object.keys(allDlsJSON))
	{
		let downloadJSON = allDlsJSON[downloadHash];
		reqDetails = downloadJSON.reqDetails;
		resDetails = downloadJSON.resDetails;
		let download = new Download(reqDetails, resDetails);
		download.classReason = downloadJSON.classReason;
		download.reported = downloadJSON.reported;
		download.action = downloadJSON.act;
		download.category = downloadJSON.cat;
		download.hash = downloadJSON.hash;
		allDownloads.put(downloadHash, download);
	};

	DLGPop.allDownloads = allDownloads;
	DLGPop.availableDMs = response.DLGJSON.availableDMs;
	DLGPop.options = response.DLGJSON.options;
	DLGPop.downloadDialogs = response.DLGJSON.downloadDialogs;
}

function populateDMs()
{
	let availableDMs = DLGPop.availableDMs;
	let dmsDropDown = document.getElementById('available-dms');
	for(let dmName of availableDMs){
		let option = document.createElement('option');
		option.value = dmName;
		option.innerHTML = dmName;
		option.id = dmName;
		dmsDropDown.appendChild(option);
	}
	let defaultDM = DLGPop.options.defaultDM || availableDMs[0];
	if(defaultDM){
		console.log('setting default dm: ', defaultDM);
		document.getElementById(defaultDM).setAttribute('selected', 'selected');
	}
}

/**
 * @param {Download} download 
 */
function downloadWithSelectedDM(download)
{
	let DMs = document.getElementById('available-dms');
	let selectedDM = DMs.options[DMs.selectedIndex].value;
	let message = {
		type: Messaging.TYP_DOWNLOAD, 
		downloadHash: download.getHash(), 
		dmName: selectedDM
	};
	browser.runtime.sendMessage(message);
	window.close();
}

/**
 * @param {Download} download 
 */
function continueWithBrowser(download)
{
	let message = {type: Messaging.TYP_CONT_WITH_BROWSER, downloadHash: download.hash};
	browser.runtime.sendMessage(message);
	DLGPop.continueWithBrowser = true;
	window.close();
}

/**
 * @param {Download} download 
 */
function downloadWithFirefox(download)
{
	browser.downloads.download({
		filename: download.getFilename(),
		saveAs: true,
		url: download.url
	});
}

/**
 * @param {Download} download 
 */
async function reportDownload(download, source){

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

	let reportData = JSON.parse(JSON.stringify(download));

	//remove stuff we don't need
	delete reportData.reqDetails;
	delete reportData.resDetails.cookieStoreId;
	delete reportData.resDetails.ip;
	delete reportData.resDetails.proxyInfo;

	//add stuff we need
	reportData._options = DLGPop.options;
	reportData._version = (await browser.management.getSelf()).version;
	reportData._reportSource = source;

	//stringify
	reportData = JSON.stringify(reportData);
	//URI encode
	reportData = encodeURIComponent(reportData);
	//base64 encode
	reportData = btoa(reportData);
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
				let message = {type: Messaging.TYP_DL_REPORTED, downloadHash: download.getHash()};
				browser.runtime.sendMessage(message);
				continueWithBrowser(download);
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
function setActionEnabled(element, enabled)
{
	if(enabled){
		element.classList.remove("disabled-action");
	}
	else{
		element.classList.add("disabled-action");
	}
}