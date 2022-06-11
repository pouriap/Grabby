class NativeMessaging {

	constructor(){
	}

	init()
	{
		this.port = new ProperPort();
		this.port.connect();

		return new Promise((resolve, reject) => {

			let timer = setTimeout(() => {
				reject("Native app took too long to respond");
			}, 5000);

			this._getAvailDMs().then((response) => {
				if(typeof response.availableDMs != 'object'){
					reject("bad DM list from native app");
				}
				this.startListening();
				NativeMessaging.port = this.port;
				resolve(response.availableDMs);
			})
			.catch((reason) => {
				reject(reason);
			})
			//this will always be called regardless of what happened
			.then(() => {
				clearTimeout(timer);
			});
		});
	}

	_getAvailDMs()
	{
		return new Promise((resolve, reject) => {
			try
			{
				this.port.setOnDisconnect((p) => {
					if(p.error){
						reject("Native app port disconnected: ", p.error.message);
					}
					reject("Native app port disconnected");
				});

				this.port.setOnMessage((response) => {
					if(typeof response != 'object'){
						reject("bad response from native app");
					}
					else if (typeof response.type === 'undefined'){
						reject("no response type from native app");
					}
					else if(response.type === NativeMessaging.MSGTYP_ERR){
						reject("native app error: " + response.content);
					}
					else if(response.type != NativeMessaging.MSGTYP_AVAIL_DMS){
						reject("bad response type from native app: " + response.type);
					}
					else{
						resolve(response);
					}
				});

				this.port.postMessage({type: NativeMessaging.MSGTYP_GET_AVAIL_DMS});
				
			}
			catch(e){
				reject(e);
			}
		});
	}

	startListening(){
		//set the final handlers
		this.port.setOnMessage(this.doOnNativeMessage);
		this.port.setOnDisconnect((p) => {
			if(p.error){
				log.err("Port disconnected: ", p.error.message);
			}
			else{
				log.err("Port disconnected");
			}
			this.port.connect();
		});
	}

	sendMessage(msg){
		this.port.postMessage(msg);
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

	doOnNativeMessage(message)
	{
		if(message.type === NativeMessaging.MSGTYP_YTDL_INFO)
		{
			log.color('green', `got info for ${message.dlHash}:`, message.info);
			let dl = DLG.allDownloads.get(message.dlHash);
			dl.streamInfo = message.info;
			dl.hidden = false;
		}

		else if(message.type === NativeMessaging.MSGTYP_ERR)
		{
			log.err('Error in native app', message.content);
		}

		else
		{
			log.err('Bad message from native app', message);
		}
	}

}

/** @type {ProperPort} */
NativeMessaging.port = null;
NativeMessaging.DLG_ADDON_ID = "download.grab.pouriap";
NativeMessaging.MSGTYP_GET_AVAIL_DMS = "get_available_dms";
NativeMessaging.MSGTYP_AVAIL_DMS = "available_dms";
NativeMessaging.MSGTYP_DOWNLOAD = "download";
NativeMessaging.MSGTYP_YTDL_INFO = "ytdl_getinfo";
NativeMessaging.MSGTYP_YTDL_AUD = "ytdl_download_audio";
NativeMessaging.MSGTYP_YTDL_VID = "ytdl_download_video";
NativeMessaging.MSGTYP_YTDLPROG = "app_download_progress";
NativeMessaging.MSGTYP_ERR = "app_error";
NativeMessaging.MSGTYP_MSG = "app_message";
NativeMessaging.MSGTYP_UNSUPP = "unsupported";

function ProperPort(){
	this._connected = false;
	this._onDisconnectHook = null;
	this._onMessageHook = null;
}

//tries to connect to a native app and throws error if it fails
ProperPort.prototype.connect = function(){
	try
	{
		this._port = browser.runtime.connectNative(NativeMessaging.DLG_ADDON_ID);
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