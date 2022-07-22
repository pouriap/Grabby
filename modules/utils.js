class Utils {

	/**
	 * Gets domain name of a url
	 * @param {string} url 
	 */
	static getDomain(url){
		let a = document.createElement('a');
		a.href = url;
		return a.hostname;
	}

	/**
	 * Gets path part of a url
	 * @param {string} url 
	 */
	static getPath(url){
		let a = document.createElement('a');
		a.href = url;
		return a.pathname;
	}
	
	/**
	 * Gets a "clean" URL, i.e. a URL without query string and fragments, etc.
	 * @param {string} url 
	 */
	static getFullPath(url){
		let a = document.createElement('a');
		a.href = url;
		return (a.protocol + '//' + a.hostname + a.pathname);
	}

	static getFileName(url){
		let path = Utils.getPath(url);
		path = decodeURI(path);
		if(path.slice(-1) === '/'){
			path = path.slice(0, -1);
		}
		let filename = path.split('/').pop();
		return (filename)? filename : '';
	}

	static getExtFromFileName(filename){
		let chuncks = filename.split('.');
		let ext = '';
		if(chuncks.length > 1){
			ext = chuncks[chuncks.length-1].toLowerCase();
		}
		return ext;
	}

	/**
	 * Gets cookies associated with the given URL
	 * @param {string} url 
	 * @returns 
	 */
	static async getCookies(url){
		let cookies = '';
		let cookiesArr = await browser.cookies.getAll({url: url});
		for(let cookie of cookiesArr){
			cookies += `${cookie.name}=${cookie.value}; `;
		}
		return cookies;
	}

	/**
	 * Performs an executeScript on a tab
	 * @param {number} tabId 
	 * @param {object} data 
	 * @returns 
	 */
	static async executeScript(tabId, data)
	{
		try
		{
			let res = await browser.tabs.executeScript(tabId, data);
			if(res.length == 1){
				return res[0];
			}
			return res;
		}
		catch(e){
			log.err('Error executing script: ', e);
			return '';
		}
	}

	static formatSeconds(seconds)
	{
		var date = new Date(null);
		date.setSeconds(seconds);
		if(seconds >= 60 * 60)
		{
			return date.toISOString().substr(11, 8);
		}
		else
		{
			return date.toISOString().substr(14, 5);
		}
	}

}