namespace VUtils
{	
	var GBPop: GrabbyPopup;

	/**
	 * Gets the GB instance from the background script and makes a copy of the needed data inside it
	 */
	export async function getBackgroundData(): Promise<GrabbyPopup>
	{
		let msg = new Messaging.MSGGetGB();
		let response = <Messaging.MSGGBJSON> await Messaging.sendMessage(msg);
		GBPop = new GrabbyPopup(response.GBJSON);
		return GBPop;
	}
	
	/**
	 * Populates the drop down list of download managers
	 */
	export function populateDMs()
	{
		let availableDMs = GBPop.availableDMs;
		let dmsDropDown = document.getElementById('available-dms')!;

		if(typeof availableDMs === 'undefined')
		{
			let option = document.createElement('option');
			option.value = '';
			option.innerHTML = '';
			option.id = '';
			dmsDropDown.appendChild(option);
			ui.get('#dl-with-grabby')?.removeAttribute('checked');
			ui.get('#dl-with-browser')?.setAttribute('checked', 'checked');
			ui.get('#dl-with-grabby')?.classList.add('disabled');
			ui.get('label[for=dl-with-grabby]')?.classList.add('disabled');
			ui.get('div#dm-list-container')?.classList.add('disabled');
		}
		else
		{
			for(let dmName of availableDMs)
			{
				let option = document.createElement('option');
				option.value = dmName;
				option.innerHTML = dmName;
				option.id = dmName;
				dmsDropDown.appendChild(option);
				let defaultDM = GBPop.options.defaultDM;
				if(defaultDM){
					//log('setting default dm: ', defaultDM);
					document.getElementById(defaultDM)!.setAttribute('selected', 'selected');
				}
			}
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

	export async function renderDownloadsList()
	{
		let GBPop = await VUtils.getBackgroundData();
		(new ViewDownloadsList(GBPop)).render();
	}
}