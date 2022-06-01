class NativeMessaging {

	constructor(){
		this.availableDMs = [];
	}

	init()
	{
		this.port = new ProperPort();
		//todo test what happens if connect fails
		this.port.connect();

		return new Promise((resolve, reject) => {
			this._sendMsgWait(
				{type: NativeMessaging.MSGTYP_NATIVE_AVAIL}, 
				NativeMessaging.MSGTYP_NATIVE_AVAIL,
				"Native app not available"
			)
			.then((response) => {
				return this._sendMsgWait(
					{type: NativeMessaging.MSGTYP_GET_AVAIL_DMS},
					NativeMessaging.MSGTYP_AVAIL_DMS,
					"Could not get available download managers from system"
				);
			})
			.then((response) => {
				this.availableDMs = response.availableDMs;
				this.startListening();
				NativeMessaging.port = this.port;
				resolve();
			})
			.catch((reason) => {
				reject(reason);
			});
		});
	}

	_sendMsgWait(message, expectedType, errorMsg)
	{
		return new Promise((resolve, reject) => {
			try
			{
				this.port.setOnDisconnect((_port) => {
					if(_port.error){
						reject(errorMsg + ": " + _port.error.message);
					}
					reject(errorMsg + ": port disconnected");
				});

				this.port.setOnMessage((response) => {
					if(typeof response != 'object'){
						reject(errorMsg + ": bad response from native app");
					}
					else if (typeof response.type === 'undefined'){
						reject(errorMsg + ": bad response type from native app");
					}
					else if(response.type === NativeMessaging.MSGTYP_HERR){
						reject(errorMsg + ": native app error: " + response.content);
					}
					else if(response.type != expectedType){
						reject(errorMsg + ": bad response type from native app");
					}
					else{
						resolve(response);
					}
				});

				this.port.postMessage(message);
				
			}
			catch(e){
				reject(e);
			}
		});
	}

	startListening(){
		//set the final handlers
		this.port.setOnMessage(this.doOnNativeMessage);
		this.port.setOnDisconnect((_port) => {
			console.error("port disconnected");
			console.error("disconnect data: ");
			console.error(_port);
			this.port.connect();
		});
	}

	//todo make it non-static
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
			console.log(`%cError in native app: ${message.content}`, "color:red;font-weight:bold;");
		}
		else{
			console.log(`%cexception in host.js: ${JSON.stringify(message)}`, "color:green;font-weight:bold;");
		}
	}

}

/** @type {ProperPort} */
NativeMessaging.port = null;
NativeMessaging.NATIVE_APP_ID = 'download.grab.pouriap';
NativeMessaging.DLG_ADDON_ID = "download.grab.pouriap"
NativeMessaging.MSGTYP_NATIVE_AVAIL = "native_app_available"
NativeMessaging.MSGTYP_GET_AVAIL_DMS = "get_available_dms"
NativeMessaging.MSGTYP_AVAIL_DMS = "available_dms"
NativeMessaging.MSGTYP_DOWNLOAD = "download"
NativeMessaging.MSGTYP_YTDL_INFO = "ytdl_getinfo"
NativeMessaging.MSGTYP_YTDL_AUD = "ytdl_download_audio"
NativeMessaging.MSGTYP_YTDL_VID = "ytdl_download_video"
NativeMessaging.MSGTYP_HERR = "app_error"
NativeMessaging.MSGTYP_HMSG = "app_message"
NativeMessaging.MSGTYP_HYTDLINFO = "app_ytdl_info"
NativeMessaging.MSGTYP_HDLPROG = "app_download_progress"
NativeMessaging.MSGTYP_UNSUPP = "unsupported"

function ProperPort(){
	this._connected = false;
	this._onDisconnectHook = null;
	this._onMessageHook = null;
}

//tries to connect to a native app and throws error if it fails
ProperPort.prototype.connect = function(){
	try
	{
		this._port = browser.runtime.connectNative(NativeMessaging.NATIVE_APP_ID);
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

ProperPort.prototype._onDisconnect = function(port){
	this._connected = false;
	if(this._onDisconnectHook != null){
		this._onDisconnectHook(port);
	}
}

ProperPort.prototype._onMessage = function(message){
	if(this._onMessageHook != null){
		this._onMessageHook(message);
	}
}

ProperPort.prototype.setOnDisconnect = function(onDisconnect){
	this._onDisconnectHook = onDisconnect;
}

ProperPort.prototype.setOnMessage = function(onMessage){
	this._onMessageHook = onMessage;
}

ProperPort.prototype.isConnected = function(){
	return this._connected;
}

ProperPort.prototype.postMessage = function(msg){
	if(!this.isConnected()){
		this.connect();
	}
	this._port.postMessage(msg);
}