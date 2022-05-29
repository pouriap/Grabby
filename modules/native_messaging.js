//todo: check if port is connected when we want to send a message

class NativeMessaging {

	init(){
		return new Promise((resolve, reject) => {
			try
			{
				let port = browser.runtime.connectNative(NativeMessaging.NATIVE_CLIENT_ID);

				let disconnectListener = (port) => {
					if(port.error){
						reject(port.error.message);
					}
					reject("Couldn't initialize connection with native host");
				}
				port.onDisconnect.addListener(disconnectListener);

				port.onMessage.addListener((response) => {
					//onDisconnect does not seem to be called when we call disconnect() ourself
					//but just to be sure we remove the listener here so that it won't be called 
					//when we diconnect()
					port.onDisconnect.removeListener(disconnectListener);
					port.disconnect();
					if(response.type === 'native_client_available'){
						//arrow functions don't have their own this
						this._getNewPort();
						resolve(true);
					}
					else if(response.type === 'error'){
						reject(response.content);
					}
					else{
						reject("Unknown error from native host");
					}
				});

				let message = {type: 'native_client_available'};
				port.postMessage(message);
			}
			catch(e){
				reject(e);
			}
		});
	}

	_getNewPort(){
		let port = browser.runtime.connectNative(NativeMessaging.NATIVE_CLIENT_ID);
		port.onMessage.addListener(this.doOnNativeMessage);
		port.onDisconnect.addListener((d) => {
			console.error("port disconnected");
			console.error("disconnect data: ", JSON.stringify(d));
			this._getNewPort();
		});
		NativeMessaging.port = port;
	}

	getAvailableDMs(){
		return new Promise((resolve, reject) => {
			let message = {type: 'get_available_dms'};
			let sending = browser.runtime.sendNativeMessage(NativeMessaging.NATIVE_CLIENT_ID, message);
			sending.then((response) => {
				if(response.type === 'available_dms'){
					let availableDMs = response.availableDMs;
					console.log('available DMs: ', availableDMs);
					if(availableDMs.length > 0){
						resolve(availableDMs);
					}
					reject("No download managers found on the system");
				}
				else{
					reject("Could not query available download managers")
				}
			}).catch((e) => {
				reject(e);
			});

		});
	}

	/**
	 * 
	 * @param {DownloadJob} job 
	 */
	static download(job){

		let message = {
			type: 'download',
			job: job
		};

		NativeMessaging.port.postMessage(message);
	}

	//TODO why is this here?
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
		else if(message.type === 'error'){
			console.log(`%cError in native host: ${message.content}`, "color:red;font-weight:bold;");
		}
		else{
			console.log(`%cexception in host.js: ${JSON.stringify(message)}`, "color:green;font-weight:bold;");
		}
	}

}

NativeMessaging.NATIVE_CLIENT_ID = 'download.grab.pouriap';
NativeMessaging.port = null;