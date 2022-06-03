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
	 * 		
	 * @param {DownloadJob} job 
	 */
	static async performJob(job){
		let browserDMs = await BrowserDMs.getAvailableDMs();
		if(browserDMs.includes(job.dmName)){
			BrowserDMs.dms[job.dmName].download(job);
		}
		else{
			NativeMessaging.download(job);
		}
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

}