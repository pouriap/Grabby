var app;
var slctdDlItem = {};

//TODO:  getBackGroundPage() doesn't work in private window https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getBackgroundPage

document.addEventListener("DOMContentLoaded", (event) => {

	document.getElementById("action-back").addEventListener("click", function(evt){
		showMainList();
	});
	
	document.getElementById("action-copy").addEventListener("click", function(evt){
		copyLinkToClipboard();
	});

	document.getElementById("action-idm").addEventListener("click", function(evt){
		dlWithIDM();
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

		let url = dlItem.url;
		let requestId = dlItem.requestId;
		let debug_reason = dlItem.debug_reason;

		let listItem = document.createElement("li");
		listItem.setAttribute("id", "req_" + requestId);
		listItem.setAttribute("class", "dl-item");
		listItem.setAttribute("title", url);
		listItem.setAttribute("data-hash", key);
		listItem.innerHTML = dlItem.filename + " (" + debug_reason + ")";

		listItem.addEventListener("click", function(evt){
			let hash = this.getAttribute("data-hash");
			let dlItem = allDlItems.get(hash);
			console.log('item clicked: ', dlItem);
			showDownloadPage(dlItem);
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

function showDownloadPage(dlItem){
	let dlList = document.getElementById("dls-list");
	let actionList = document.getElementById("actions-list");
	document.getElementById("filename").innerHTML = dlItem.filename;
	document.getElementById("time").innerHTML = (new Date(dlItem.time)).toLocaleString("en-US");
	document.getElementById("origin").innerHTML = dlItem.origin;
	document.getElementById("size").innerHTML = dlItem.sizeMB || "unknown";
	document.getElementById("url").innerHTML = dlItem.url;
	document.getElementById("output").style.display = 'none';
	hideElement(dlList);
	showElement(actionList);
	slctdDlItem = dlItem;
}

function showMainList(){
	let dlList = document.getElementById("dls-list");
	let actionList = document.getElementById("actions-list");
	hideElement(actionList);
	showElement(dlList);
}

function copyLinkToClipboard(){
	copyToClipBoard(slctdDlItem.url);
}

function dlWithIDM(){

	console.log("dling with IDM: ", slctdDlItem);

	if(!app.runtime.idmAvailable){
		console.log("IDM is not available");
		return;
	}

	let msgBase = "MSG#1#14#1#0:1";

	let url = slctdDlItem.url;
	let userAgent = navigator.userAgent;
	let cookies = slctdDlItem.reqHeaders['cookie'];
	let referer = slctdDlItem.reqHeaders['referer'];

	let urlCode = ",6=" + url.length + ":" + url;
	let userAgentCode = ",54=" + userAgent.length + ":" + userAgent;
	let cookiesCode = (cookies)? (",51=" + cookies.length + ":" + cookies) : "";
	let refererCode = (referer)? (",50=" + referer.length + ":" + referer) : "";

	let IDMMessage = msgBase + urlCode + userAgentCode + cookiesCode + refererCode + ";";

	let port = browser.runtime.connectNative("com.tonec.idm");
	port.postMessage(IDMMessage);
	port.disconnect();

}

function downloadWithBrowser() {
	browser.downloads.download({
		saveAs: true,
		url: slctdDlItem.url
	});
}

//todo: add -JLO to curl and equivalants to wget
function copyCurlCommand(){

	let cmd = `curl "${slctdDlItem.url}" --header "User-Agent: ${navigator.userAgent}"`;

	if(slctdDlItem.reqHeaders['cookie']){
		cmd = cmd + ` --header "Cookie: ${slctdDlItem.reqHeaders['cookie']}"`;
	}
	if(slctdDlItem.reqHeaders['referer']){
		cmd = cmd + ` --header "Referer: ${slctdDlItem.reqHeaders['referer']}"`;
	}
	if(slctdDlItem.reqHeaders['accept']){
		cmd = cmd + ` --header "Accept: ${slctdDlItem.reqHeaders['accept']}"`;
	}
	if(slctdDlItem.reqHeaders['accept-encoding']){
		cmd = cmd + ` --header "Accept-Encoding: ${slctdDlItem.reqHeaders['accept-encoding']}"`;
	}

	copyToClipBoard(cmd);
}

function copyWgetCommand(){

	let cmd = `wget "${slctdDlItem.url}" --header "User-Agent: ${navigator.userAgent}"`;

	if(slctdDlItem.reqHeaders['cookie']){
		cmd = cmd + ` --header "Cookie: ${slctdDlItem.reqHeaders['cookie']}"`;
	}
	if(slctdDlItem.reqHeaders['referer']){
		cmd = cmd + ` --header "Referer: ${slctdDlItem.reqHeaders['referer']}"`;
	}
	if(slctdDlItem.reqHeaders['accept']){
		cmd = cmd + ` --header "Accept: ${slctdDlItem.reqHeaders['accept']}"`;
	}
	if(slctdDlItem.reqHeaders['accept-encoding']){
		cmd = cmd + ` --header "Accept-Encoding: ${slctdDlItem.reqHeaders['accept-encoding']}"`;
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
			// fake.style.border = 'none';
			// fake.style.outline = 'none';
			// fake.style.boxShadow = 'none';
			// fake.style.background = 'transparent';

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