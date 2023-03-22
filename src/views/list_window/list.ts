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
		(ui.getAll('.list [type="checkbox"]') as NodeListOf<HTMLInputElement>).forEach((input) => {
			input.setAttribute('checked', 'checked');
			input.checked = true;
		});
		this.updateSelection();
	}

	protected unselectVisible()
	{
		(ui.getAll('.list [type="checkbox"]') as NodeListOf<HTMLInputElement>).forEach((input) => {
			input.removeAttribute('checked');
			input.checked = false;
		});
		this.updateSelection();
	}

	protected updateSelection()
	{
		let selectionCount = 0;
		(ui.getAll('.list [type="checkbox"]') as NodeListOf<HTMLInputElement>).forEach((input) => {
			input.removeAttribute('checked');
			if(input.checked) selectionCount++;
		});

		ui.get('#selection-count > span')!.innerHTML = selectionCount.toString();
	}
}