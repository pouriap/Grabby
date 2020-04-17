var DEBUG = true;

/**
 * @type {DlGrabApp}
 */
var app;
/**
 * @type {Download}
 */
var download = {};

var windowId;
var downloadHash;

document.addEventListener("DOMContentLoaded", (event) => {

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

	document.getElementById("report").addEventListener("click", function(evt){
		reportDownload();
	});

	browser.windows.getCurrent().then((windowInfo)=>{
		windowId = windowInfo.id;
		let message = {type: 'dl_dialog_populate_request', windowId: windowId};
		let sending = browser.runtime.sendMessage(message);
		sending.then((response)=>{
			downloadHash = response.downloadHash;
			var getting = browser.runtime.getBackgroundPage();
			getting.then(onGot, onError);
		});
	});

});

//todo: add report button 
window.addEventListener("beforeunload", (event) => {
	let downloadPageTabId = download.req_details.tabId;
	let message = {type: 'dl_dialog_closing', windowId: windowId, downloadPageTabId: downloadPageTabId};
	browser.runtime.sendMessage(message);
});

function onGot(page) { 

	app = page.app;
	download = app.allDownloads.get(downloadHash);

	//enable/disable IDM download
	if(page.app.runtime.idmAvailable){
		document.getElementById('action-idm').classList.remove("disabled-action");
		document.getElementById('action-idm').removeAttribute("title");
	}
	else{
		document.getElementById('action-idm').classList.add("disabled-action");
		document.getElementById('action-idm').setAttribute("title", "Cannot communicate with IDM");
	}

	document.getElementById("filename").innerHTML = download.getFilename();
	document.getElementById("filename").setAttribute("title", download.getFilename());
	document.getElementById("size").innerHTML = 
		(download.getSize() !== "unknown")? filesize(download.getSize()) : download.getSize();
	document.getElementById("url").innerHTML = download.url;
	document.getElementById("url").setAttribute("title", download.url);
	document.getElementById("origin").innerHTML = download.origin;
	document.getElementById("origin").setAttribute("title", download.origin);
	document.getElementById("output").style.display = 'none';

}

//todo: replicate accept-ranges request headers
//todo: put all these in the same file

function onError(error) {
	console.log(`Error getting data from background: ${error}`);
}


function copyLinkToClipboard(){
	copyToClipBoard(download.url);
	window.close();
}

function downloadWithIDM(){

	console.log("dling with IDM: ", download);

	if(!app.runtime.idmAvailable){
		console.log("IDM is not available");
		return;
	}

	let msgBase = "MSG#1#14#1#0:1";

	let url = download.url;
	let userAgent = navigator.userAgent;
	let cookies = download.reqHeaders['cookie'];
	let referer = download.reqHeaders['referer'];

	let urlCode = ",6=" + url.length + ":" + url;
	let userAgentCode = ",54=" + userAgent.length + ":" + userAgent;
	let cookiesCode = (cookies)? (",51=" + cookies.length + ":" + cookies) : "";
	let refererCode = (referer)? (",50=" + referer.length + ":" + referer) : "";

	let IDMMessage = msgBase + urlCode + userAgentCode + cookiesCode + refererCode + ";";

	let port = browser.runtime.connectNative("com.tonec.idm");
	port.postMessage(IDMMessage);
	port.disconnect();

	window.close();

}

function downloadWithFirefox() {
	browser.downloads.download({
		saveAs: true,
		url: download.url
	});
	window.close();
}

function copyCurlCommand(){

	let cmd = `curl -JL "${download.url}" -o "${download.getFileExtension()}" --header "User-Agent: ${navigator.userAgent}"`;

	if(download.reqHeaders['cookie']){
		cmd = cmd + ` --header "Cookie: ${download.reqHeaders['cookie']}"`;
	}
	if(download.reqHeaders['referer']){
		cmd = cmd + ` --header "Referer: ${download.reqHeaders['referer']}"`;
	}
	if(download.reqHeaders['accept']){
		cmd = cmd + ` --header "Accept: ${download.reqHeaders['accept']}"`;
	}
	if(download.reqHeaders['accept-encoding']){
		cmd = cmd + ` --header "Accept-Encoding: ${download.reqHeaders['accept-encoding']}"`;
	}

	copyToClipBoard(cmd);

	window.close();
}

function copyWgetCommand(){

	let cmd = `wget "${download.url}" -o "${download.getFileExtension()}" --header "User-Agent: ${navigator.userAgent}"`;

	if(download.reqHeaders['cookie']){
		cmd = cmd + ` --header "Cookie: ${download.reqHeaders['cookie']}"`;
	}
	if(download.reqHeaders['referer']){
		cmd = cmd + ` --header "Referer: ${download.reqHeaders['referer']}"`;
	}
	if(download.reqHeaders['accept']){
		cmd = cmd + ` --header "Accept: ${download.reqHeaders['accept']}"`;
	}
	if(download.reqHeaders['accept-encoding']){
		cmd = cmd + ` --header "Accept-Encoding: ${download.reqHeaders['accept-encoding']}"`;
	}

	copyToClipBoard(cmd);

	window.close();
}


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


function reportDownload(download){

	//remove possibly identifying information
	for(let i=0; i<download.reqHeaders.length; i++){
		let headerName = download.reqHeaders[i].name;
		if(headerName.toLowerCase() === "cookie"){
			delete download.reqHeaders[i];
			break;
		}
	}
	delete download.req_details.requestHeaders;

	let json = JSON.stringify(download);
	let data = "value1=" + encodeURIComponent(json);
	let iftttURL = "https://maker.ifttt.com/trigger/log_posted/with/key/bui_BfKHyiHPPCMAb7Ea_b";
	_sendPOSTRequest(iftttURL, data);

	function _sendPOSTRequest(url, data){
		var xhr = new XMLHttpRequest();
		xhr.open("POST", url, true);
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

		xhr.onreadystatechange = function() {
			console.log("state changed");
			if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
				document.getElementById("report").innerHTML = "Report submitted. Thank you.";
				document.getElementById("report").setAttribute("class", "success");
			}
			else{
				document.getElementById("report").innerHTML = "Failed to submit error.";
				document.getElementById("report").setAttribute("class", "fail");
			}
			document.getElementById("report").setAttribute("disabled", "disabled");
		}

		xhr.send(data);
	}

}

