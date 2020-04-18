/**
 * adds the app variable to this popup's global scope
 */
function globalizeApp(){
	return new Promise(async function(resolve){
		let windowId = (await browser.windows.getCurrent()).id;
		let message = {type: 'request_app_instance', windowId: windowId};
		await browser.runtime.sendMessage(message);
		console.log("got app instance: ", app);
		resolve();
	});
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
}

/**
 * @param {Download} download 
 */
function copyWgetCommand(download){

	let cmd = `wget "${download.url}" -o "${download.getFilename()}" --header "User-Agent: ${navigator.userAgent}"`;

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

	if(download.reported){
		document.getElementById("action-report").innerHTML = "Already reported";
		setActionEnabled(document.getElementById("action-report"), false);
		return;
	}

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
	data = data + "&value2=" + source;
	let iftttURL = "https://maker.ifttt.com/trigger/log_posted/with/key/bui_BfKHyiHPPCMAb7Ea_b";
	_sendPOSTRequest(iftttURL, data);

	function _sendPOSTRequest(url, data){
		var xhr = new XMLHttpRequest();
		xhr.open("POST", url, true);
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

		xhr.onreadystatechange = function() {
			console.log("state changed");
			if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
				document.getElementById("action-report").innerHTML = "Report submitted. Thank you.";
				document.getElementById("action-report").setAttribute("class", "success");
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