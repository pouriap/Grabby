//todo: use JSX and react?
abstract class PopupView extends View
{
	protected abstract htmlFile: string;

	async doRender()
	{
		try
		{
			let html = await ui.fetchText(this.htmlFile);
			ui.get('#content')!.innerHTML = html;
			await this.doRenderPopup();
		}
		catch(e)
		{
			log.err('failed to prepare for render', e);
		}
	}

	protected abstract doRenderPopup(): Promise<void>;
}

//download progress is sent to background via the native app, and then 
//sent here using messaging
browser.runtime.onMessage.addListener((msg: Messaging.MSGYTDLProg) => 
{
	if(msg.type === Messaging.TYP_YTDL_PROGRESS)
	{
		let percent = msg.percent;
		let dlHash = msg.dlHash;
		let el = ui.get(`#downloads-list li[data-hash="${dlHash}"]`);

		if(typeof el === 'undefined')
		{
			log.warn('received progress but corresponding UI is not present');
			return;
		}

		//remove the progress bar when download is complete
		if(percent == '100')
		{
			el.removeAttribute('style');
		}
		else{
			el.style.background = `linear-gradient(to right, #8c8fb1 ${percent}%, #fff 0%)`;
		}
	}
});

document.addEventListener("DOMContentLoaded", (e) => {
	//the defaul view for popup is the downloads list
	(new ViewDownloadsList()).render();
});