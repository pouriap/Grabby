declare var List: any;

namespace WindowLinkList
{
	const SCRIPT_GET_ALL = '/content_scripts/get_all_links.js';
	const SCRIPT_UTILS = '/scripts/utils.js';

	let links: extracted_links;

	document.addEventListener("DOMContentLoaded", async (e) => 
	{
		document.querySelectorAll(".action").forEach(function(action){
			action.addEventListener('click', (evt)=>{
				actionClicked(action);
			});
		});

		let window = await browser.windows.getCurrent({populate: true});
		let url = window.tabs[0].url;
		let tabId = Number (url.substring(url.indexOf("?tabId=") + 7) );
		Utils.executeScript(tabId, {file: SCRIPT_GET_ALL}, [{file: SCRIPT_UTILS}])
			.then(populateList);
	});

	function populateList(data: extracted_links)
	{
		links = data;
		let i = 0;

		//todo: remove duplicate hrefs

		for(let link of data.links)
		{
			let id = "link_" + i++;
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
		}

		let options = { valueNames: ['href', 'text'] };
		let list = new List('links_list', options);
	}

	/**
	 * This is called every time something with '.action' class is clicked in a popup dialog
	 */
	function actionClicked(clickedAction: Element)
	{
		let id = clickedAction.id;
		let disabled = clickedAction.getAttribute("class")?.indexOf("disabled-action") !== -1;

		if(disabled){
			return;
		}

		switch(id)
		{	
			case "action-select":
				selectVisible();
				break;

			case "action-unselect":
				unselectVisible();
				break;
			
			case "action-download":
				downloadSeleced();
				break;

			default:
				break;
		}
	}

	function selectVisible()
	{
		ui.getAll('.list input').forEach((input) => {
			input.setAttribute('checked', 'checked');
		});
	}

	function unselectVisible()
	{
		ui.getAll('.list input').forEach((input) => {
			input.removeAttribute('checked');
		});
	}

	function downloadSeleced()
	{
		ui.getAll('.list input').forEach((e) => {
			if( (e as HTMLInputElement).checked )
			{
				let index = Number( e.getAttribute('data-index')! );
				//download
			}
		});
	}

	window.addEventListener("beforeunload", function()
	{
		//let msg = new Messaging.MSGDlDialogClosing(continueWithBrowser, selectedDl.hash);
		//Messaging.sendMessage(msg);
	});

}