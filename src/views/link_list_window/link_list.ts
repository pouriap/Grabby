declare var List: any;

class LinkListView extends View
{
	readonly SCRIPT_GET_ALL = '/content_scripts/get_all_links.js';
	readonly SCRIPT_GET_SELECTION = '/content_scripts/get_selection_links.js';
	readonly SCRIPT_UTILS = '/scripts/utils.js';

	//@ts-ignore
	linksData: extracted_links;

	async doRender()
	{
		let window = await browser.windows.getCurrent({populate: true});
		let url = window.tabs[0].url;
		let tabId = Number(Utils.getURLParam(url, 'tabId'));
		let listType = Utils.getURLParam(url, 'listType');
		let script = (listType === 'all')? this.SCRIPT_GET_ALL : this.SCRIPT_GET_SELECTION;
		let data = await Utils.executeScript(tabId, 
			{file: script}, [{file: this.SCRIPT_UTILS}]);
		this.renderDialog(data);
	}

	renderDialog(data: extracted_links)
	{
		this.linksData = data;
		this.populateList();
		let selector = this.getDMSelector();
		ui.get('#dm-list-container')?.appendChild(selector);
	}

	populateList()
	{
		let i = 0;

		for(let link of this.linksData.links)
		{
			let id = "link_" + i;
			let chkbox = ui.create('input', {type: 'checkbox', id: id, 'data-index': i.toString()}) as HTMLInputElement;
			let text = ui.create('span', {class: 'text'});
			text.innerHTML = link.text;
			let br = ui.create('br');
			let href = ui.create('span', {class: 'href'});
			href.innerHTML = link.href;
			let div = ui.create('div');
			let label = ui.create('label', {for: id});
			let li = ui.create('li');
			div.appendChild(text);
			div.appendChild(br);
			div.appendChild(href);
			label.appendChild(chkbox);
			label.appendChild(div);
			li.appendChild(label);
			ui.get('.list')!.appendChild(li);
			i++;
		}

		let options = { valueNames: ['href', 'text'] };
		let list = new List('links_list', options);
	}

	/**
	 * This is called every time something with '.action' class is clicked in a popup dialog
	 */
	onActionClicked(clickedAction: Element)
	{
		let id = clickedAction.id;
		let disabled = clickedAction.getAttribute("class")?.indexOf("disabled-action") !== -1;

		if(disabled){
			return;
		}

		switch(id)
		{	
			case "action-select":
				this.selectVisible();
				break;

			case "action-unselect":
				this.unselectVisible();
				break;
			
			case "action-download":
				this.downloadSeleced();
				break;

			default:
				break;
		}
	}

	selectVisible()
	{
		ui.getAll('.list input').forEach((input) => {
			input.setAttribute('checked', 'checked');
		});
	}

	unselectVisible()
	{
		ui.getAll('.list input').forEach((input) => {
			input.removeAttribute('checked');
		});
	}

	downloadSeleced()
	{
		let allLinks = this.linksData.links;

		let linksToDownload: extracted_links = {
			originPageReferer: this.linksData.originPageReferer,
			originPageUrl: this.linksData.originPageUrl,
			links: []
		};

		ui.getAll('.list input').forEach((e) => {
			if( (e as HTMLInputElement).checked )
			{
				let index = Number( e.getAttribute('data-index')! );
				linksToDownload.links.push(allLinks[index]);
			}
		});

		DownloadJob.getFromLinks(this.getSelectedDM(), linksToDownload).then((job) => {
			let msg = new Messaging.MSGDownload(job);
			Messaging.sendMessage(msg);
			window.close();
		});
	}

}

document.addEventListener("DOMContentLoaded", (e) => {
	(new LinkListView()).render();
});