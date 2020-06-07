//todo: check if port is connected when we want to send a message

class NativeUtils  {

	async init(){
		let available = await this._isNativeClientAvailable();
		if(available === false){
			throw 'Native client unavailable';
		}
		//todo: remove in production
		else if(available !== true){
			throw available;
		}
		this._getNewPort();
		return true;
	}

	//todo: move this inside initialize()?
	_isNativeClientAvailable(){
		return new Promise((resolve) => {
			try{
				let port = browser.runtime.connectNative(NativeUtils.NATIVE_CLIENT_ID);
				port.onMessage.addListener((response) => {
					port.disconnect();
					if(response.type === 'native_client_available'){
						resolve(true);
					}
					else if(response.type === 'exception'){
						resolve(response.error);
					}
					else if(response.type === 'object'){
						resolve(JSON.stringify(response));
					}
					else{
						resolve(response);
					}
				});
				port.onDisconnect.addListener((p) => {
					if(p.error){
						resolve(p.error.message);
					}
				});
				let message = {type: 'native_client_available'};
				port.postMessage(message);
			}catch(e){
				resolve(e);
			}
		});
	}

	_getNewPort(){
		let port = browser.runtime.connectNative(NativeUtils.NATIVE_CLIENT_ID);
		port.onMessage.addListener(this.doOnNativeMessage);
		port.onDisconnect.addListener((d) => {
			console.error("port disconnected");
			console.error("disconnect data: ", JSON.stringify(d));
			this._getNewPort();
		});
		NativeUtils.port = port;
	}

	async getAvailableDMs(){
		try{
			
			let message = {type: 'get_available_dms'};
			let response = await browser.runtime.sendNativeMessage(NativeUtils.NATIVE_CLIENT_ID, message);
			if(response.type === 'available_dms'){
				let availableDMs = response.availableDMs;
				console.log('available DMs: ', availableDMs);
				if(!availableDMs.length){
					let options = {
						type: "basic", 
						title: "Download Grab", 
						message: "ERROR: No download managers found on the system"
					};
					browser.notifications.create(options);
				}
				return availableDMs;
			}
			else{
				return [];
			}

		}catch(e){
			return [];
		}
	}

	/**
	 * Downloads a single Download with the specified download manager
	 * @param {string} dmName name of dm to use
	 * @param {Download} download 
	 */
	static async downloadSingle(dmName, download){

		if(!dmName){
			return;
		}

		let originPageCookies = (download.getHost())? await NativeUtils.getCookies(download.getHost()) : '';
		let originPageReferer = '';
		let originTabId = -1;
		try{
			let tabs = await browser.tabs.query({url: download.origin});
			originTabId = (tabs[0])? tabs[0].id : -1;
			originPageReferer = await browser.tabs.executeScript(
				originTabId, {code: 'document.referrer'}
			);
		}catch(e){
			console.log('exec failed: ', e, ' \n in tab: ', originTabId);
		}

		let message = {
			type: 'download',
			url : download.url,
			referer : download.getHeader('referer', 'request') || '',
			cookies : download.getHeader('cookie', 'request') || '',
			originPageCookies: originPageCookies || '',
			originPageReferer: originPageReferer || '',
			dmName : dmName,
			filename : download.getFilename(),
			postData : download.reqDetails.postData
		};

		NativeUtils.port.postMessage(message);

	}

	static async downloadMultiple(dmName, links, originPageUrl, originPageReferer){

		if(!dmName){
			return;
		}

		let downloadItems = [];
		let originPageDomain = (originPageUrl)? Utils.getDomain(originPageUrl) : '';
		let originPageCookies = (originPageDomain)? await NativeUtils.getCookies(originPageDomain) : '';
		//get the cookies for each link and add it to all download items
		for(let link of links){
			if(!link.href){
				continue
			}
			let href = link.href;
			let description = link.description || '';
			let linkDomain = Utils.getDomain(href) || '';
			let linkCookies = await NativeUtils.getCookies(linkDomain) || '';
			let downloadItem = {
				url: href,
				description: description,
				cookies: linkCookies
			};
			downloadItems.push(downloadItem);
		}

		let message = {
			type: 'download_all',
			downloadItems : downloadItems,
			originPageUrl : originPageUrl || '',
			originPageReferer : originPageReferer || '',
			originPageCookies : originPageCookies || '',
			dmName : dmName,
		};

		NativeUtils.port.postMessage(message);

	}

	static getCookies(domain){
		return new Promise(async function(resolve){
			let cookies = '';
			//subdomain cookies, for example dl2.website.com
			let domainCookies = await browser.cookies.getAll({domain: domain});
			for(let cookie of domainCookies){
				if(cookie.domain === domain){
					cookies += `${cookie.name}=${cookie.value}; `;
				}
			}
			//wildcard cookies, for example .website.com
			let domainParts = domain.split('.').reverse();
			let rootDomain = domainParts[1] + '.' + domainParts[0];
			//return if we are not in a subdomain
			if(rootDomain === domain){
				resolve(cookies);
				return;
			}
			let wildcardCookies = await browser.cookies.getAll({domain: `.${rootDomain}`});
			for(let cookie of wildcardCookies){
				if(cookie.domain === `.${rootDomain}`){
					cookies += `${cookie.name}=${cookie.value}; `;
				}
			}
			resolve(cookies);
		});
	}

	doOnNativeMessage(message){
		//black addon stdout
		//green node.js stdout
		//blue flashgot.exe stdout
		if(message.type === 'download_complete'){
			console.log(`%cdownload complete: ${message.job}`, "color:green;font-weight:bold;");
		}
		else if(message.type === 'download_failed'){
			console.log(`%cdownload FAILED: ${message.reason}`, "color:green;font-weight:bold;");
		}
		else if(message.type === 'flashgot_output'){
			console.log(`%c${message.output}`, "color:blue;font-weight:bold;");
		}
		else if(message.type === 'exception'){
			console.log(`%cexception in host.js: ${message.error}`, "color:green;font-weight:bold;");
		}
		else{
			console.log(`%cexception in host.js: ${JSON.stringify(message)}`, "color:green;font-weight:bold;");
		}
	}

}

NativeUtils.NATIVE_CLIENT_ID = 'download.grab.pouriap';
NativeUtils.port = null;