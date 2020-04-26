/**
 * @returns {Promise} a promise resolved with a FixedSizeMap of all downloads
 */
async function getBackgroundData(){
	
	let message = {type: "get_bg_data"};
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
		download.debug_reason = downloadJSON.debug_reason;
		allDownloads.put(downloadHash, download);
	});

	let appJSON = response.appJSON;
	let data = {allDownloads: allDownloads, appJSON: appJSON};
	return Promise.resolve(data);
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
		case "action-copy":
			copyLinkToClipboard(selectedDl);
			break;

		case "action-firefox":
			downloadWithFirefox(selectedDl);
			break;
		
		case "action-idm":
			downloadWithIDM(selectedDl);
			break;

		case "action-curl":
			copyCurlCommand(selectedDl);
			break;

		case "action-wget":
			copyWgetCommand(selectedDl);
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
 * @param {Download} download 
 */
function copyLinkToClipboard(download){
	copyToClipBoard(download.url);
}

/**
 * @param {Download} download 
 */
function downloadWithIDM(download){

	console.log("dling with IDM: ", download);

	if(!appJSON.runtime.idmAvailable){
		console.log("IDM is not available");
		return;
	}

	let msgBase = "MSG#1#14#1#0:1";

	let url = download.url;
	let userAgent = navigator.userAgent;
	let cookies = download.getHeader('cookie');
	let referer = download.getHeader('referer');

	let urlCode = ",6=" + url.length + ":" + url;
	let userAgentCode = ",54=" + userAgent.length + ":" + userAgent;
	let cookiesCode = (cookies)? (",51=" + cookies.length + ":" + cookies) : "";
	let refererCode = (referer)? (",50=" + referer.length + ":" + referer) : "";

	let IDMMessage = msgBase + urlCode + userAgentCode + cookiesCode + refererCode + ";";

	let port = browser.runtime.connectNative("com.tonec.idm");
	port.postMessage(IDMMessage);
	port.disconnect();
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
function copyCurlCommand(download){

	let cmd = `curl -JL "${download.url}" -o "${download.getFilename()}" --header "User-Agent: ${navigator.userAgent}"`;

	let cookie = download.getHeader('cookie', 'request');
	let referer = download.getHeader('referer', 'request');
	let accept = download.getHeader('accept', 'request');
	let acceptEncoding = download.getHeader('accept-encoding', 'request');

	if(cookie){
		cmd = cmd + ` --header "Cookie: ${cookie}"`;
	}
	if(referer){
		cmd = cmd + ` --header "Referer: ${referer}"`;
	}
	if(accept){
		cmd = cmd + ` --header "Accept: ${accept}"`;
	}
	if(acceptEncoding){
		cmd = cmd + ` --header "Accept-Encoding: ${acceptEncoding}"`;
	}

	copyToClipBoard(cmd);
}

/**
 * @param {Download} download 
 */
function copyWgetCommand(download){

	let cmd = `wget "${download.url}" -o "${download.getFilename()}" --header "User-Agent: ${navigator.userAgent}"`;

	let cookie = download.getHeader('cookie', 'request');
	let referer = download.getHeader('referer', 'request');
	let accept = download.getHeader('accept', 'request');
	let acceptEncoding = download.getHeader('accept-encoding', 'request');

	if(cookie){
		cmd = cmd + ` --header "Cookie: ${cookie}"`;
	}
	if(referer){
		cmd = cmd + ` --header "Referer: ${referer}"`;
	}
	if(accept){
		cmd = cmd + ` --header "Accept: ${accept}"`;
	}
	if(acceptEncoding){
		cmd = cmd + ` --header "Accept-Encoding: ${acceptEncoding}"`;
	}

	copyToClipBoard(cmd);
}

/**
 * @param {string} content 
 */
function copyToClipBoard(content){

	try{

		let copying = navigator.clipboard.writeText(content);

		copying.then(function() {
			//success
			_copyCallBack(true);
		}, function() {
			//fail
			_copyCallBack(false);
		});

		console.log("API copy performed");

	}catch(error){

		console.log("API copy failed: ", error);

		try{

			let hiddenText = document.createElement("textarea");
			hiddenText.style.position = 'fixed';
			hiddenText.style.top = 0;
			hiddenText.style.left = 0;
			hiddenText.style.width = '1px';
			hiddenText.style.height = '1px';
			hiddenText.style.padding = 0;

			document.querySelector("body").appendChild(hiddenText);
			hiddenText.value = content;
			hiddenText.focus();
			hiddenText.select();
			hiddenText.setSelectionRange(0, 99999);	//for mobile devices
			let success = document.execCommand('copy');
			document.querySelector("body").removeChild(hiddenText);

			console.log('legacy copy performed');

			_copyCallBack(success);

		}catch(error){
			console.log("legacy copy failed: ", error);
			_copyCallBack(false);
		}
	}

	function _copyCallBack(success){

		console.log('copy callback!');

		if(success){
			document.querySelector("#output").innerHTML = "copied successfully";
			document.querySelector("#output").setAttribute("class", "success");
		}
		else{
			document.querySelector("#output").innerHTML = "copy failed";
			document.querySelector("#output").setAttribute("class", "fail");
		}
	
		//flash the output text
		document.querySelector("#output").style.display = 'block';
		var oldItem = document.querySelector("#output");
		var cloneItem = oldItem.cloneNode(true); 
		document.querySelector("#info").replaceChild(cloneItem, oldItem);
	}

}

/**
 * @param {Download} download 
 */
function reportDownload(download, source){

	//don't allow report if already reported
	if(download.reported){
		document.getElementById("action-report").innerHTML = "Already reported";
		setActionEnabled(document.getElementById("action-report"), false);
		return;
	}

	//don't allow reports from private windows because privacy
	if(download.reqDetails.incognito){
		document.getElementById("action-report").innerHTML = "Report not enabled in private browsing";
		setActionEnabled(document.getElementById("action-report"), false);
		return;
	}

	//encrypt data and send them to ifttt
	//i'm assuming google and ifttt guys are not reading this code to find the password
	//add debug reason to reported info
	//todo: change debug_reason to reason and add to production for now
	download.resDetails.debug_reason = download.debug_reason;
	let json = JSON.stringify(download.resDetails);
	let encJson = CryptoJS.AES.encrypt(json, "1xr9@URmfF").toString();
	let data = "value1=" + encodeURIComponent(encJson);
	data = data + "&value2=" + source;
	let url = "https://maker.ifttt.com/trigger/log_posted/with/key/bui_BfKHyiHPPCMAb7Ea_b";
	_sendPOSTRequest(url, data);

	function _sendPOSTRequest(url, data){
		var xhr = new XMLHttpRequest();
		xhr.open("POST", url, true);
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

		xhr.onreadystatechange = function() {
			console.log("state changed");
			if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
				document.getElementById("action-report").innerHTML = "Report submitted. Thank you.";
				document.getElementById("action-report").setAttribute("class", "success");
				//todo: this doesn't work anymore because we have a JSON copy of downloads now
				download.reported = true;
			}
			else{
				document.getElementById("action-report").innerHTML = "Failed to submit error.";
				document.getElementById("action-report").setAttribute("class", "fail");
			}
			setActionEnabled(document.getElementById("action-report"), false);
		}

		xhr.send(data);
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