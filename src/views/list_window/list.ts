declare var List: any;

abstract class ListView extends View
{
	protected abstract htmlFile: string;

	protected async doRender()
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

	protected selectVisible()
	{
		ui.getAll('.list input').forEach((input) => {
			input.setAttribute('checked', 'checked');
		});
	}

	protected unselectVisible()
	{
		ui.getAll('.list input').forEach((input) => {
			input.removeAttribute('checked');
		});
	}
}