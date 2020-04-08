var allDlItems = {};
var Utils = {};
var itemToDownload = {};

//TODO: add user agent and other things to curl/wget to make them look more real
//todo: make icon svg
//todo: do styles according to browser styles: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Browser_styles

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
		getCurlCommand();
	});

	document.getElementById("action-wget").addEventListener("click", function(evt){
		getWgetCommand();
	});

	var getting = browser.runtime.getBackgroundPage();
	getting.then(onGot, onError);

});

function onGot(page) {

	allDlItems = page.app.allDlItems;
	Utils = page.app.Utils;

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
		listItem.innerHTML = Utils.getFilenameFromURL(url) + " (" + debug_reason + ")";

		listItem.addEventListener("click", function(evt){
			let hash = this.getAttribute("data-hash");
			let dlItem = allDlItems.get(hash);
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
	console.log(`Error: ${error}`);
}

function showDownloadPage(dlItem){
	let dlList = document.getElementById("dls-list");
	let actionList = document.getElementById("actions-list");
	document.getElementById("filename").innerHTML = Utils.getFilenameFromURL(dlItem.url);
	document.getElementById("time").innerHTML = (new Date(dlItem.time)).toLocaleString("en-US");
	document.getElementById("origin").innerHTML = dlItem.origin;
	document.getElementById("output").style.display = 'none';
	hideElement(dlList);
	showElement(actionList);
	itemToDownload = dlItem;
}

function showMainList(){
	let dlList = document.getElementById("dls-list");
	let actionList = document.getElementById("actions-list");
	hideElement(actionList);
	showElement(dlList);
}

function copyLinkToClipboard(){
	copyToClipBoard(itemToDownload.url);
}

function dlWithIDM(){
	console.log("dling with IDM: ", itemToDownload);
	Utils.downloadWithIDM(itemToDownload);
}

function getCurlCommand(){
	//todo: don't add cookie header if there's no cookie
	let cmd = 'curl "' + itemToDownload.url + '" --header "Cookie: ' + itemToDownload.cookies + '"';
	copyToClipBoard(cmd);
}

function getWgetCommand(){
	let cmd = 'wget "' + itemToDownload.url + '" --header "Cookie: ' + itemToDownload.cookies + '"';
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