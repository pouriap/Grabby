abstract class View
{
	//@ts-ignore
	protected GBPop: GrabbyPopup;

	async render()
	{
		try
		{
			// Get a copy of the GB instance from the background script 
			let msg = new Messaging.MSGGetGB();
			let response = await Messaging.sendMessage(msg) as Messaging.MSGGBJSON;
			this.GBPop = new GrabbyPopup(response.GBJSON);
	
			await this.doRender();
			//todo: check if we are assining listeners multiple times
			ui.getAll(".action").forEach((e) => {
				e.addEventListener('click', () => {
					let disabled = e.getAttribute("class")?.indexOf("disabled-action") !== -1;
					if(disabled){
						return;
					}
					this.onActionClicked(e);
				});
			});
		}
		catch(e)
		{
			log.err('error in rendering view', e);
		}
	}

	protected abstract doRender(): Promise<void>;
	protected abstract onActionClicked(e: Element): void;

	/**
	 * Populates the drop down list of download managers
	 */
	protected getDMSelector(): HTMLSelectElement
	{
		let availableDMs = this.GBPop.availableDMs;
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
			let defaultDM = this.GBPop.options.defaultDM;

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

	protected getSelectedDM(): string
	{
		let DMs = document.getElementById('available-dms') as HTMLSelectElement;
		return DMs.options[DMs.selectedIndex].value;
	}
}