namespace VUtils
{	
	var DLGPop: DownloadGrabPopup;

	/**
	 * Gets the DLG instance from the background script and makes a copy of the needed data inside it
	 */
	export async function getBackgroundData(): Promise<DownloadGrabPopup>
	{
		let msg = new Messaging.MSGGetDLG();
		let response = <Messaging.MSGDLGJSON> await Messaging.sendMessage(msg);
		DLGPop = new DownloadGrabPopup(response.DLGJSON);
		return DLGPop;
	}
	
	/**
	 * Populates the drop down list of download managers
	 */
	export function populateDMs()
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
	
	export function downloadWithSelectedDM(download: Download)
	{
		let DMs = document.getElementById('available-dms')! as HTMLSelectElement;
		let selectedDM = DMs.options[DMs.selectedIndex].value;	
		let msg = new Messaging.MSGDownload(download.hash, selectedDM);
		Messaging.sendMessage(msg);
		window.close();
	}
}