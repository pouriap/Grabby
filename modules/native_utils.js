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
	 * Downloads a single url with the specified download manager
	 */
	downloadSingle : function(dmName, url, referer, cookies, filename, postData){
		let message = {
			type: 'download',
			url : url,
			referer : referer,
			cookies : cookies,
			dmName : dmName,
			filename : filename,
			postData : postData
		};
		//we cannot use port.postMessage() here because this function is called from popup context
		//and port is not initialized there and Big Brother Mozilla thinks it's best for us
		//to not have access to our own goddamn addon's background context
		//fuck you Mozilla
		browser.runtime.sendNativeMessage(DG.NativeUtils.NATIVE_CLIENT_ID, message);
	},

	downloadMultiple: async function(dmName, links, originPageUrl, originPageReferer){

		let downloadItems = [];
		let originPageDomain = getDomain(originPageUrl);
		let originPageCookies = await getCookies(originPageDomain);
		//get the cookies for each link and add it to all download items
		for(let link of links){
			let href = link.href;
			let description = (link.description)? link.description : '';
			let linkDomain = getDomain(href);
			let linkCookies = await getCookies(linkDomain);
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
			originPageReferer : originPageReferer,
			originPageCookies : originPageCookies,
			dmName : dmName,
		};
		DG.NativeUtils.port.postMessage(message);

		function getDomain(url){
			let a = document.createElement('a');
			a.href = url;
			return a.hostname;
		}

		function getCookies(domain){
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

}