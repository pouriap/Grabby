var DLGPop: DownloadGrabPopup;
var currTab: tabinfo;

/**
 * Gets the DLG instance from the background script and makes a copy of the needed data inside it
 */
async function getBackgroundData()
{
	let msg = new Messaging.MSGGetDLG();
	let response = <Messaging.MSGDLGJSON> await Messaging.sendMessage(msg);
	DLGPop = new DownloadGrabPopup(response.DLGJSON);

	let tab = (await browser.tabs.query({currentWindow: true, active: true}))[0];
	currTab = DLGPop.tabs.getsure(tab.id);
}

/**
 * Populates the drop down list of download managers
 */
function populateDMs()
{
	let availableDMs = DLGPop.availableDMs;
	let dmsDropDown = document.getElementById('available-dms')!;
	for(let dmName of availableDMs){
		let option = document.createElement('option');
		option.value = dmName;
		option.innerHTML = dmName;
		option.id = dmName;
		dmsDropDown.appendChild(option);
	}
	let defaultDM = DLGPop.options.defaultDM || availableDMs[0];
	if(defaultDM){
		//log('setting default dm: ', defaultDM);
		document.getElementById(defaultDM)!.setAttribute('selected', 'selected');
	}
}

function downloadWithSelectedDM(download: Download)
{
	let DMs = document.getElementById('available-dms')! as HTMLSelectElement;
	let selectedDM = DMs.options[DMs.selectedIndex].value;	
	let msg = new Messaging.MSGDownload(download.hash, selectedDM);
	Messaging.sendMessage(msg);
	window.close();
}

function continueWithBrowser(download: Download)
{
	let msg = new Messaging.MSGContWithBrowser(download.hash);
	Messaging.sendMessage(msg);
	DLGPop.continueWithBrowser = true;
	window.close();
}

function downloadWithFirefox(download: Download)
{
	browser.downloads.download({
		filename: download.filename,
		saveAs: true,
		url: download.url
	});
}

function downloadWithYtdl(download: Download, formatId: number, type: string)
{
	let msg = new Messaging.MSGYTDLGet(download.hash, formatId, type);
	Messaging.sendMessage(msg);
}

function setActionEnabled(element: Element, enabled: boolean)
{
	if(enabled){
		element.classList.remove("disabled-action");
	}
	else{
		element.classList.add("disabled-action");
	}
}