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
	 * 
	 * @param {DownloadJob} job 
	 */
	static async download(job){

		let message = {
			type: 'download',
			job: job
		};

		NativeUtils.port.postMessage(message);
	}

	static async getCookies(url){
		let cookies = '';
		let cookiesArr = await browser.cookies.getAll({url: url});
		for(let cookie of cookiesArr){
			cookies += `${cookie.name}=${cookie.value}; `;
		}
		return cookies;
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