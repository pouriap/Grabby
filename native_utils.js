var NativeUtils = {

	nativeClientId : 'download.grab.pouriap',

	isNativeClientAvailable : function(){
		return new Promise(function(resolve){
			let port = browser.runtime.connectNative(NativeUtils.nativeClientId);
			port.onMessage.addListener((response) => {
				if(response.type === 'native_client_available'){
					resolve(true);
				}
				else{
					resolve(false);
				}
			});
			port.onDisconnect.addListener(() => {
				resolve(false);
			});
			let message = {type: 'native_client_available'};
			port.postMessage(message);
		});
	},

	getAvailableDMs : function(){
		return new Promise(function(resolve){
			let port = browser.runtime.connectNative(NativeUtils.nativeClientId);
			port.onMessage.addListener((response) => {
				if(response.type === 'available_dms'){
					let availableDMs = response.availableDMs;
					port.disconnect();
					resolve(availableDMs);
				}
				else{
					resolve({});
				}
			});
			port.onDisconnect.addListener(()=>{
				resolve({});
			});
			let message = {type: 'get_available_dms'};
			port.postMessage(message);
		});
	},

	/**
	 * Downloads a single url with the specified download manager
	 */
	downloadSingle : function(dmName, url, referer, cookies, filename, postData){
		let port = browser.runtime.connectNative(NativeUtils.nativeClientId);
		let message = {
			type: 'download',
			url : url,
			referer : referer,
			cookies : cookies,
			dmName : dmName,
			filename : filename,
			postData : postData
		};
		port.postMessage(message);
	},

	downloadMultiple: async function(dmName, links, originPageUrl, originPageReferer, originPageDomain){

		let downloadItems = [];
		let originPageCookies = await getCookies(originPageDomain);
		//get the cookies for each link and add it to all download items
		for(let link of links){
			let href = link.href;
			let description = link.description;
			let a = document.createElement('a');
			a.href = href;
			let linkDomain = a.hostname;
			let linkCookies = await getCookies(linkDomain);
			let downloadItem = {
				url: href,
				description: description,
				cookies: linkCookies
			};
			downloadItems.push(downloadItem);
		}

		let port = browser.runtime.connectNative(NativeUtils.nativeClientId);
		let message = {
			type: 'download_all',
			downloadItems : downloadItems,
			originPageUrl : originPageUrl,
			originPageReferer : originPageReferer,
			originPageCookies : originPageCookies,
			dmName : dmName,
		};
		port.postMessage(message);

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