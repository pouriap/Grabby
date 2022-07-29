class ui
{	
	static create(type, attrs)
	{
		let el = document.createElement(type);
		for(let attr of attrs)
		{
			el.setAttribute(attr, attrs[attr]);
		}
		return el;
	}

	static get(query)
	{
		let all = document.querySelectorAll(query);
		return (all.length == 1)? all[0] : all;
	}

	static update(el, attrs)
	{
		//if it's a query
		if(typeof el === 'string')
		{
			el = ui.get(el);
		}

		if(typeof el === 'object')
		{
			for(let attr of attrs)
			{
				el.setAttribute(attr, attrs[attr]);
			}
			return el;
		}
	}
}