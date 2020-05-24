var DG = DG || {};

//todo: node.js process keeps open unless we do "port.disconnect()" or page is closed

DG.NativeUtils = {

	NATIVE_CLIENT_ID : 'download.grab.pouriap',
	port: null,
	
	initialize: function(){
		return new Promise(async function(resolve, reject){
			let available = await DG.NativeUtils._isNativeClientAvailable();
			if(available === false){
				reject('Native client unavailable');
				return;
			}
			//todo: remove in production
			else if(available !== true){
				reject(available);
				return;
			}
			DG.NativeUtils.port = browser.runtime.connectNative(DG.NativeUtils.NATIVE_CLIENT_ID);
			resolve(true);
		});
	},

	//todo: move this inside initialize()?
	_isNativeClientAvailable : function(){
		return new Promise(function(resolve){
			try{
				let port = browser.runtime.connectNative(DG.NativeUtils.NATIVE_CLIENT_ID);
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
	},

	getAvailableDMs : function(){
		return new Promise(async function(resolve){

			try{

				let message = {type: 'get_available_dms'};
				let response = await browser.runtime.sendNativeMessage(DG.NativeUtils.NATIVE_CLIENT_ID, message);
	
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
					resolve(availableDMs);
				}
				else{
					resolve({});
				}

			}catch(e){
				resolve({});
			}

		});
	},

	/**
	 * Downloads a single Download with the specified download manager
	 * @param {string} dmName name of dm to use
	 * @param {Download} download 
	 */
	downloadSingle : async function(dmName, download){

		if(!dmName){
			return;
		}

		let originPageCookies = (download.getHost())? await this._getCookies(download.getHost()) : '';
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
		DG.NativeUtils.port.postMessage(message);

	},

	downloadMultiple: async function(dmName, links, originPageUrl, originPageReferer){

		if(!dmName){
			return;
		}

		let downloadItems = [];
		let originPageDomain = (originPageUrl)? this._getDomain(originPageUrl) : '';
		let originPageCookies = (originPageDomain)? await this._getCookies(originPageDomain) : '';
		//get the cookies for each link and add it to all download items
		for(let link of links){
			if(!link.href){
				continue
			}
			let href = link.href;
			let description = link.description || '';
			let linkDomain = this._getDomain(href) || '';
			let linkCookies = await this._getCookies(linkDomain) || '';
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
			originPageUrl : originPageUrl,
			originPageReferer : originPageReferer || '',
			originPageCookies : originPageCookies || '',
			dmName : dmName,
		};
		DG.NativeUtils.port.postMessage(message);

	},

	_getDomain: function(url){
		let a = document.createElement('a');
		a.href = url;
		return a.hostname;
	},

	_getCookies: function(domain){
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

}