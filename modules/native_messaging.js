class NativeMessaging {

	init(){
		return new Promise((resolve, reject) => {
			try
			{
				let port = new properPort();
				port.connect();

				//temporary onDisconnect handler for initialization
				port.setOnDisconnect((port) => {
					if(port.error){
						reject(port.error.message);
					}
					reject("Couldn't initialize connection with native host");
				});

				//temporary onMessage handler for initialization
				port.setOnMessage((response) => {
					if(response.type === 'native_client_available')
					{
						//set the final handlers if native client is available and finish init
						port.setOnMessage(this.doOnNativeMessage);
						port.setOnDisconnect((port) => {
							console.error("port disconnected");
							console.error("disconnect data: ");
							console.error(port);
							port.connect();
						});
						NativeMessaging.port = port;
						resolve(true);
					}
					//error stuff if init fails
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

	getAvailableDMs(){
		return new Promise((resolve, reject) => {
			let message = {type: 'get_available_dms'};
			//TODO why aren't we using tha port?!
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

function properPort(){
	this._connected = false;
	this._onDisconnectHook = null;
	this._onMessageHook = null;
}

properPort.prototype.connect = function(){
	try
	{
		this._port = browser.runtime.connectNative(NativeMessaging.NATIVE_CLIENT_ID);
		this._port.onDisconnect.addListener((port) => {
			this._onDisconnect(port);
		});
		this._port.onMessage.addListener((message) => {
			this._onMessage(message);
		});
		this._connected = true;
	}
	catch(e){
		throw 'Failed to connect to port: ' + e.toString();
	}
}

properPort.prototype._onDisconnect = function(port){
	this._connected = false;
	if(this._onDisconnectHook != null){
		this._onDisconnectHook(port);
	}
}

properPort.prototype._onMessage = function(message){
	if(this._onMessageHook != null){
		this._onMessageHook(message);
	}
}

properPort.prototype.setOnDisconnect = function(onDisconnect){
	this._onDisconnectHook = onDisconnect;
}

properPort.prototype.setOnMessage = function(onMessage){
	this._onMessageHook = onMessage;
}

properPort.prototype.isConnected = function(){
	return this._connected;
}

properPort.prototype.postMessage = function(msg){
	if(!this.isConnected()){
		this.connect();
	}
	this._port.postMessage(msg);
}