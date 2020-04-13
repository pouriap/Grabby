var DEBUG = true;
var app;
var clickedDownload = {};

//TODO:  getBackgroundPage() doesn't work in private window https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getBackgroundPage

document.addEventListener("DOMContentLoaded", (event) => {

	document.getElementById("action-back").addEventListener("click", function(evt){
		showDownloadsList();
	});

	document.getElementById("action-clearList").addEventListener("click", function(evt){
		clearDownloadsList();
	});
	
	document.getElementById("action-copy").addEventListener("click", function(evt){
		copyLinkToClipboard();
	});

	document.getElementById("action-firefox").addEventListener("click", function(evt){
		downloadWithFirefox();
	});

	document.getElementById("action-idm").addEventListener("click", function(evt){
		downloadWithIDM();
	});

	document.getElementById("action-curl").addEventListener("click", function(evt){
		copyCurlCommand();
	});

	document.getElementById("action-wget").addEventListener("click", function(evt){
		copyWgetCommand();
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
			let download = allDownloads.get(hash);
			console.log('item clicked: ', download);
			showDownloadDetails(download);
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
		download.getSizeMB() + ((download.getSizeMB() !== "unknown")? "MB" : "");
	document.getElementById("time").innerHTML = 
		(new Date(download.time)).toLocaleString("en-US", constants.dateForamt);
	document.getElementById("url").innerHTML = download.url;
	document.getElementById("url").setAttribute("title", download.url);
	document.getElementById("origin").innerHTML = download.origin;
	document.getElementById("origin").setAttribute("title", download.origin);
	document.getElementById("output").style.display = 'none';
	hideElement(dlList);
	showElement(actionList);
	clickedDownload = download;
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

function copyLinkToClipboard(){
	copyToClipBoard(clickedDownload.url);
}

function downloadWithIDM(){

	console.log("dling with IDM: ", clickedDownload);

	if(!app.runtime.idmAvailable){
		console.log("IDM is not available");
		return;
	}

	let msgBase = "MSG#1#14#1#0:1";

	let url = clickedDownload.url;
	let userAgent = navigator.userAgent;
	let cookies = clickedDownload.reqHeaders['cookie'];
	let referer = clickedDownload.reqHeaders['referer'];

	let urlCode = ",6=" + url.length + ":" + url;
	let userAgentCode = ",54=" + userAgent.length + ":" + userAgent;
	let cookiesCode = (cookies)? (",51=" + cookies.length + ":" + cookies) : "";
	let refererCode = (referer)? (",50=" + referer.length + ":" + referer) : "";

	let IDMMessage = msgBase + urlCode + userAgentCode + cookiesCode + refererCode + ";";

	let port = browser.runtime.connectNative("com.tonec.idm");
	port.postMessage(IDMMessage);
	port.disconnect();

}

function downloadWithFirefox() {
	browser.downloads.download({
		saveAs: true,
		url: clickedDownload.url
	});
}

function copyCurlCommand(){

	let cmd = `curl -JLO "${clickedDownload.url}" --header "User-Agent: ${navigator.userAgent}"`;

	if(clickedDownload.reqHeaders['cookie']){
		cmd = cmd + ` --header "Cookie: ${clickedDownload.reqHeaders['cookie']}"`;
	}
	if(clickedDownload.reqHeaders['referer']){
		cmd = cmd + ` --header "Referer: ${clickedDownload.reqHeaders['referer']}"`;
	}
	if(clickedDownload.reqHeaders['accept']){
		cmd = cmd + ` --header "Accept: ${clickedDownload.reqHeaders['accept']}"`;
	}
	if(clickedDownload.reqHeaders['accept-encoding']){
		cmd = cmd + ` --header "Accept-Encoding: ${clickedDownload.reqHeaders['accept-encoding']}"`;
	}

	copyToClipBoard(cmd);
}

function copyWgetCommand(){

	let cmd = `wget "${clickedDownload.url}" --header "User-Agent: ${navigator.userAgent}"`;

	if(clickedDownload.reqHeaders['cookie']){
		cmd = cmd + ` --header "Cookie: ${clickedDownload.reqHeaders['cookie']}"`;
	}
	if(clickedDownload.reqHeaders['referer']){
		cmd = cmd + ` --header "Referer: ${clickedDownload.reqHeaders['referer']}"`;
	}
	if(clickedDownload.reqHeaders['accept']){
		cmd = cmd + ` --header "Accept: ${clickedDownload.reqHeaders['accept']}"`;
	}
	if(clickedDownload.reqHeaders['accept-encoding']){
		cmd = cmd + ` --header "Accept-Encoding: ${clickedDownload.reqHeaders['accept-encoding']}"`;
	}

	copyToClipBoard(cmd);
}

function hideElement(element){
	element.classList.add("hidden");
}

function showElement(element){
	element.classList.remove("hidden");
}

function copyToClipBoard(content){

	try{

		let copying = navigator.clipboard.writeText(content);

		copying.then(function() {
			//success
			copyCallBack(true);
		}, function() {
			//fail
			copyCallBack(false);
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

			copyCallBack(success);

		}catch(error){
			console.log("legacy copy failed: ", error);
			copyCallBack(false);
		}
	}

	function copyCallBack(success){

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
		document.querySelector("#download-details").replaceChild(cloneItem, oldItem);	
	}

}