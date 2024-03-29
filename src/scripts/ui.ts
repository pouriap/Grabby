namespace ui
{	
	export function create(type: string, attrs?: {[index:string]: string})
	{
		let el = document.createElement(type);
		for(let attr in attrs)
		{
			el.setAttribute(attr, attrs[attr]);
		}
		return el;
	}

	/**
	 * Updates an HTML element
	 * @param el a single element, or a query selector for a single element
	 * @param attrs key->value map of attributes
	 */
	export function update(el: string | HTMLElement, attrs: {[index: string]: string})
	{
		//if it's a query
		if(typeof el === 'string')
		{
			el = ui.get(el) as HTMLElement;
		}

		if(typeof el === 'object')
		{
			for(let attr in attrs)
			{
				el.setAttribute(attr, attrs[attr]);
			}
			return el;
		}
	}

	export function get(query: string): HTMLElement | undefined
	{
		let e = document.querySelector(query) as HTMLElement;
		return (e)? e : undefined;
	}

	export function getAll(query: string)
	{
		return document.querySelectorAll(query);
	}

	/**
	 * Hides the specified element(s)
	 * @param el a single element, or a query selector for one or more elements
	 */
	export function hide(el: HTMLElement | string)
	{
		//if it's an element
		if(typeof el === 'object')
		{
			el.classList.add("hidden");	
			return;
		}

		//if it's a query
		if(typeof el === 'string')
		{
			ui.getAll(el).forEach(function(e){
				e.classList.add("hidden");		
			});
		}
	}

	/**
	 * Unhides the specified element(s)
	 * @param el a single element, or a query selector for one or more elements
	 */
	export function show(el: HTMLElement | string)
	{
		//if it's an element
		if(typeof el === 'object')
		{
			el.classList.remove("hidden");
			return;
		}

		//if it's a query
		if(typeof el === 'string')
		{
			ui.getAll(el).forEach(function(e){
				e.classList.remove("hidden");		
			});
		}
	}

	export async function fetchText(location: string)
	{
		let response = await fetch(location);
		let html = await response.text();
		return html;
	}

}