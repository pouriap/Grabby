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
			await this.renderChildView();
		}
		catch(e)
		{
			log.err('failed to prepare for render', e);
		}
	}

	protected abstract renderChildView(): Promise<void>;
}

//todo show downlods progress

document.addEventListener("DOMContentLoaded", (e) => {
	//the defaul view for popup is the downloads list
	(new ViewDownloadsList()).render();
});