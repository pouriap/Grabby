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
	}

}