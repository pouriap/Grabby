class ui
{	
	static create(type, attrs)
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
	 * @param {*} el a single element, or a query selector for a single element
	 * @param {object} attrs key->value map of attributes
	 * @returns 
	 */
	static update(el, attrs)
	{
		//if it's a query
		if(typeof el === 'string')
		{
			el = ui.get(el);
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

	static get(query)
	{
		return document.querySelector(query);
	}

	static getAll(query)
	{
		let els = document.querySelectorAll(query);
		//add a each function to the selection because jQuery comfortable
		els.each = function(f){
			for(var i=0; i<els.length; i++){
				f.bind(els[i])();
			}
		}
		return els;
	}

	/**
	 * Hides the specified element(s)
	 * @param {*} el a single element, or a query selector for one or more elements
	 */
	static hide(el)
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
			ui.getAll(el).each(function(){
				this.classList.add("hidden");		
			});
		}
	}

	/**
	 * Unhides the specified element(s)
	 * @param {*} el a single element, or a query selector for one or more elements
	 */
	static show(el)
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
			ui.getAll(el).each(function(){
				this.classList.remove("hidden");		
			});
		}
	}

}