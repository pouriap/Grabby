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

			let chkbox = ui.create('input', {
				type: 'checkbox', 
				id: id, 
				'data-index': video.index.toString()
			});
			
			let title = ui.create('span', {class: 'title'});
			title.innerHTML = video.title;

			let br = ui.create('br');

			let duration = ui.create('span', {class: 'duration'});
			duration.innerHTML = 'Duration: ' + Utils.formatSeconds(video.duration);

			let thumb = ui.create('img', {class: 'thumbnail'}) as HTMLImageElement;
			thumb.src = video.thumbnail;

			let div = ui.create('div');
			let label = ui.create('label', {for: id});
			label.onchange = (e) => {this.updateSelection()};
			let li = ui.create('li', {'data-index': video.index.toString()});

			// progress bar
			let progDiv = ui.create('div', {'class': 'progress-bar', 'style': 'display: none;'});
			let progFill = ui.create('span', {'class': 'progress-bar-fill', 'style': 'width:0%;'});
			progDiv.appendChild(progFill);

			if(video.progress)
			{
				if(video.progress.status === 'Complete')
				{
					progFill.style.width = '100%';
					progDiv.style.display = 'block';
				}
				else if(video.progress.percent)
				{
					let percent = video.progress.percent;
					progFill.style.width = `${percent}%`;
					progDiv.style.display = 'block';
				}
			}
			
			div.appendChild(title);
			div.appendChild(br);
			div.appendChild(duration);
			div.appendChild(progDiv);

			label.appendChild(chkbox);
			label.appendChild(thumb);
			label.appendChild(div);

			li.appendChild(label);

			ui.get('.list')!.appendChild(li);
		}

		let options = { valueNames: ['title'] };
		let list = new List('playlist', options);

		this.onProgress(this.handleProgress.bind(this));
	}

	private handleProgress(msg: Messaging.MSGYTDLProg)
	{
		if(msg.dlHash != this.dlHash) return;

		let index = msg.plIndex;
		let status = msg.progress.status;
		let percent = msg.progress.percent;
		let progFill = ui.get(`.list li[data-index="${index}"] .progress-bar-fill`);

		if(typeof progFill != 'undefined')
		{
			if(status === 'Complete')
			{
				progFill.style.width = '100%';
			}

			progFill.style.width = `${percent}%`;
			progFill.parentElement!.style.display = 'block';
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