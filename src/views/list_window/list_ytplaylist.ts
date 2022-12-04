class YTPLaylistView extends ListView
{
	protected htmlFile = 'list_ytplaylist.html';
	private dlHash: string;
	//@ts-ignore
	private download: YTPlaylistDownload;

	constructor(dlHash: string)
	{
		super();
		this.dlHash = dlHash;
	}

	protected async renderChildView()
	{
		this.download = this.GBPop.allDownloads.get(this.dlHash) as YTPlaylistDownload;

		for(let video of this.download.listData!.items)
		{
			let id = "video_" + video.index;
			let chkbox = ui.create('input', 
				{type: 'checkbox', id: id, 'data-index': video.index.toString()}) as HTMLInputElement;
			let title = ui.create('span', {class: 'title'});
			title.innerHTML = video.title;
			let div = ui.create('div');
			let label = ui.create('label', {for: id});
			let li = ui.create('li', {'data-index': video.index.toString()});
			div.appendChild(title);
			label.appendChild(chkbox);
			label.appendChild(div);
			li.appendChild(label);
			ui.get('.list')!.appendChild(li);
		}

		let options = { valueNames: ['title'] };
		let list = new List('playlist', options);

		this.onProgress(this.handleProgress.bind(this));
	}

	private handleProgress(prog: progress_data)
	{
		if(prog.dlHash != this.dlHash) return;

		let index = prog.plIndex;
		let percent = prog.percent;
		let el = ui.get(`.list li[data-index="${index}"]`);
		if(typeof el != 'undefined')
		{
			el.style.background = `linear-gradient(to right, #8c8fb1 ${percent}%, #fff 0%)`;
		}
	}

	protected onActionClicked(clickedAction: Element)
	{
		let id = clickedAction.id;

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

	private downloadSeleced()
	{
		let indexesToGet: string[] = [];

		ui.getAll('.list input').forEach((e) => {
			if( (e as HTMLInputElement).checked )
			{
				indexesToGet.push(e.getAttribute('data-index')!);
			}
		});

		//don't do anything if no links are selected
		if(indexesToGet.length === 0)
		{
			return;
		}

		let quality = ui.get('#quality') as HTMLSelectElement;
		let res = quality.options[quality.selectedIndex].value;
		if(res.endsWith('p')) res = res.substr(0, res.length - 1);

		if(res != 'mp3')
		{
			let msg = new Messaging.MSGYTDLVideoPL(this.download.url, 
				indexesToGet, this.download.hash, res);
			Messaging.sendMessage(msg);
		}
		else
		{
			let msg = new Messaging.MSGYTDLAudioPL(this.download.url, 
				indexesToGet, this.download.hash);
			Messaging.sendMessage(msg);
		}

	}

}