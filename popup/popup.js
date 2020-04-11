var app;
var clickedDlItem = {};

//TODO:  getBackGroundPage() doesn't work in private window https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getBackgroundPage

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
	let allDlItems = app.allDlItems;

	//populate list of downloads
	let keys = allDlItems.getKeys();
	//reverse to show latest downloads on top
	keys.reverse();

	for (const key of keys) {

		let dlItem = allDlItems.get(key);

		let listItem = document.createElement("li");
		listItem.setAttribute("id", "req_" + dlItem.requestId);
		listItem.setAttribute("class", "dl-item " + dlItem.debug_gray);
		listItem.setAttribute("title", dlItem.url);
		listItem.setAttribute("data-hash", key);
		listItem.innerHTML = dlItem.getFilename() + " (" + dlItem.debug_reason + ")";

		listItem.addEventListener("click", function(evt){
			let hash = this.getAttribute("data-hash");
			let dlItem = allDlItems.get(hash);
			console.log('item clicked: ', dlItem);
			showDownloadDetails(dlItem);
		});

		document.getElementById("dls-list").appendChild(listItem);

	}

	//enable/disable IDM download
	if(page.app.runtime.idmAvailable){
		document.getElementById('action-idm').classList.remove("disabled-action");
	}
	else{
		document.getElementById('action-idm').classList.add("disabled-action");
	}

}

function onError(error) {
	console.log(`Error getting data from background: ${error}`);
}

/**
 * 
 * @param {DlItem} dlItem 
 */
function showDownloadDetails(dlItem){
	let dlList = document.getElementById("dls-list");
	let actionList = document.getElementById("actions-list");
	document.getElementById("filename").innerHTML = dlItem.getFilename();
	document.getElementById("time").innerHTML = (new Date(dlItem.time)).toLocaleString("en-US", app.options.dateForamt);
	document.getElementById("origin").innerHTML = dlItem.origin;
	document.getElementById("size").innerHTML = dlItem.getSizeMB();
	document.getElementById("url").innerHTML = dlItem.url;
	document.getElementById("output").style.display = 'none';
	hideElement(dlList);
	showElement(actionList);
	clickedDlItem = dlItem;
}

function showDownloadsList(){
	let dlList = document.getElementById("dls-list");
	let actionList = document.getElementById("actions-list");
	hideElement(actionList);
	showElement(dlList);
}

function clearDownloadsList(){
	document.querySelectorAll(".dl-item").forEach((element)=>{
        element.parentElement.removeChild(element);
	});
	let message = {type: 'clear_list'};
	browser.runtime.sendMessage(message);
}

function copyLinkToClipboard(){
	copyToClipBoard(clickedDlItem.url);
}

function downloadWithIDM(){

	console.log("dling with IDM: ", clickedDlItem);

	if(!app.runtime.idmAvailable){
		console.log("IDM is not available");
		return;
	}

	let msgBase = "MSG#1#14#1#0:1";

	let url = clickedDlItem.url;
	let userAgent = navigator.userAgent;
	let cookies = clickedDlItem.reqHeaders['cookie'];
	let referer = clickedDlItem.reqHeaders['referer'];

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
		url: clickedDlItem.url
	});
}

function copyCurlCommand(){

	let cmd = `curl -JLO "${clickedDlItem.url}" --header "User-Agent: ${navigator.userAgent}"`;

	if(clickedDlItem.reqHeaders['cookie']){
		cmd = cmd + ` --header "Cookie: ${clickedDlItem.reqHeaders['cookie']}"`;
	}
	if(clickedDlItem.reqHeaders['referer']){
		cmd = cmd + ` --header "Referer: ${clickedDlItem.reqHeaders['referer']}"`;
	}
	if(clickedDlItem.reqHeaders['accept']){
		cmd = cmd + ` --header "Accept: ${clickedDlItem.reqHeaders['accept']}"`;
	}
	if(clickedDlItem.reqHeaders['accept-encoding']){
		cmd = cmd + ` --header "Accept-Encoding: ${clickedDlItem.reqHeaders['accept-encoding']}"`;
	}

	copyToClipBoard(cmd);
}

function copyWgetCommand(){

	let cmd = `wget "${clickedDlItem.url}" --header "User-Agent: ${navigator.userAgent}"`;

	if(clickedDlItem.reqHeaders['cookie']){
		cmd = cmd + ` --header "Cookie: ${clickedDlItem.reqHeaders['cookie']}"`;
	}
	if(clickedDlItem.reqHeaders['referer']){
		cmd = cmd + ` --header "Referer: ${clickedDlItem.reqHeaders['referer']}"`;
	}
	if(clickedDlItem.reqHeaders['accept']){
		cmd = cmd + ` --header "Accept: ${clickedDlItem.reqHeaders['accept']}"`;
	}
	if(clickedDlItem.reqHeaders['accept-encoding']){
		cmd = cmd + ` --header "Accept-Encoding: ${clickedDlItem.reqHeaders['accept-encoding']}"`;
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
		document.querySelector("#actions-list").replaceChild(cloneItem, oldItem);	
	}

}