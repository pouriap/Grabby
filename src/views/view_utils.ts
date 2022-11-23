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
	export function getDMSelector(): HTMLSelectElement
	{
		let availableDMs = GBPop.availableDMs;
		let dmsDropDown = ui.create('select', {id: 'available-dms'}) as HTMLSelectElement;

		if(typeof availableDMs === 'undefined')
		{
			let option = document.createElement('option');
			option.value = '';
			option.innerHTML = '';
			option.id = '';
			dmsDropDown.appendChild(option);
			dmsDropDown.classList.add('disabled');
		}
		else
		{
			let defaultDM = GBPop.options.defaultDM;

			for(let dmName of availableDMs)
			{
				let option = document.createElement('option');
				option.value = dmName;
				option.innerHTML = dmName;
				option.id = dmName;			
				if(defaultDM){
					option.setAttribute('selected', 'selected');
				}
				dmsDropDown.appendChild(option);
			}
		}

		return dmsDropDown;
	}

	export function getSelectedDM(): string
	{
		let DMs = document.getElementById('available-dms')! as HTMLSelectElement;
		log.d('thing be', DMs.options[DMs.selectedIndex]);
		return DMs.options[DMs.selectedIndex].value;
	}

	export async function renderDownloadsList()
	{
		let GBPop = await VUtils.getBackgroundData();
		(new ViewDownloadsList(GBPop)).render();
	}
}