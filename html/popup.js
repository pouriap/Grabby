var allDlItems = {};
var Utils = {};
var itemToDownload = {};


window.addEventListener('load', (event) => {

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

	var getting = browser.runtime.getBackgroundPage();
	getting.then(onGot, onError);

});

function onGot(page) {

	allDlItems = page.allDlItems;
	Utils = page.Utils;

	for (const key of allDlItems.getKeys()) {

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

}

function onError(error) {
	console.log(`Error: ${error}`);
}

function showDownloadPage(dlItem){
	let dlList = document.getElementById("dls-list");
	let actionList = document.getElementById("actions-list");
	document.getElementById("action-desc").innerHTML = Utils.getFilenameFromURL(dlItem.url);
	document.getElementById("action-time").innerHTML = (new Date(dlItem.time)).toLocaleString("en-US");
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
	navigator.clipboard.writeText(itemToDownload.url);
}

function dlWithIDM(){
	console.log("dling with IDM: ", itemToDownload);
	Utils.downloadWithIDM(itemToDownload);
}

function getCurlCommand(){

}



function hideElement(element){
	element.style.display = "none";
}

function showElement(element){
	element.style.display = "block";
}