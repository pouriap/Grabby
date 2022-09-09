namespace NativeMessaging
{
	/* defining this class first */

	class ProperPort
	{
		private _port: any = undefined;
		private _connected = false;
		private _onDisconnectHook = (port: any) => {};
		private _onMessageHook = (msg: NativeMessage) => {};
	
		//tries to connect to a native app and throws error if it fails
		connect()
		{
			try
			{
				this._port = browser.runtime.connectNative(DLG_ADDON_ID);
				this._port.onDisconnect.addListener((port: any) => {
					this._onDisconnect(port);
				});
				this._port.onMessage.addListener((message: NativeMessage) => {
					this._onMessage(message);
				});
				this._connected = true;
			}
			catch(e){
				throw 'Failed to connect to port: ' + e.toString();
			}
		}
	
		private _onDisconnect(port: any)
		{
			this._connected = false;
			if(this._onDisconnectHook != null){
				this._onDisconnectHook(port);
			}
		}
		
		private _onMessage(message: NativeMessage)
		{
			this._onMessageHook(message);
		}
		
		setOnDisconnect(onDisconnect: (port: any) => void)
		{
			this._onDisconnectHook = onDisconnect;
		}
		
		setOnMessage(onMessage: (msg: NativeMessage) => void)
		{
			this._onMessageHook = onMessage;
		}
		
		isConnected()
		{
			return this._connected;
		}
		
		postMessage(msg: NativeMessage)
		{
			if(!this.isConnected()){
				this.connect();
			}

			this._port.postMessage(msg);
		}
	}


	/* sent messages */
	//these are the messsages we send to the native app
	export interface NativeMessage
	{
		type: string;
	}

	export class MSG_Download implements NativeMessage
	{
		type = MSGTYP_DOWNLOAD;
		constructor(public job: DownloadJob){};
	}

	export class MSG_YTDLInfo implements NativeMessage
	{
		type = MSGTYP_YTDL_INFO;
		constructor(public url: string, public dlHash: string){};
	}

	//the 'type' property of the following 3 is the same, only the contents of the message is different
	export class MSG_YTDLManifest implements NativeMessage
	{
		type = MSGTYP_YTDL_GET;
		constructor(public url: string, public filename: string, public dlHash: string, 
			public formatId: string){};
	}

	export class MSG_YTDLVideo implements NativeMessage
	{
		type = MSGTYP_YTDL_GET;
		constructor(public url: string, public filename: string, public dlHash: string,
			public formatId: string){};
	}

	export class MSG_YTDLAudio implements NativeMessage
	{
		type = MSGTYP_YTDL_GET;
		audioOnly = true;
		constructor(public url: string, public filename: string, public dlHash: string){};
	}

	/* recived messages */
	//these are messages we receive from the native app and never send outself
	//so just a type will suffice becasue we never want to create a new object

	type MSGRCV_AvailDMs = {
		name: string,
		available: boolean,
		error?: string
	}

	type MSGRCV_YTDLInfo = {
		type: string,
		dlHash: string,
		info: ytdlinfo,
	};

	type MSGRCV_YTDLFail = {
		type: string,
		dlHash: string
	}

	type MSGRCV_YTDLProg = {
		type: string,
		dlHash?: string,
		tabId?: number,
		percent: string
	}

	type MSGRCV_YTDLComp = {
		type: string,
		dlHash?: string,
		tabId?: number,
	}

	type MSGRCV_General = {
		type: string,
		content: string
	}

	type MSGRCV_Error = {
		type: string,
		content: string
	}


	/* now the real stuff */

	const DLG_ADDON_ID = "download.grab.pouriap";
	const MSGTYP_GET_AVAIL_DMS = "get_available_dms";
	const MSGTYP_AVAIL_DMS = "available_dms";
	const MSGTYP_DOWNLOAD = "download";
	const MSGTYP_YTDL_INFO = "ytdl_getinfo";
	const MSGTYP_YTDL_GET = "ytdl_get";
	const MSGTYP_YTDLPROG = "app_download_progress";
	const MSGTYP_ERR = "app_error";
	const MSGTYP_MSG = "app_message";
	const MSGTYP_YTDL_COMP = "ytdl_comp";
	const MSGTYP_YTDL_FAIL = "ytdl_fail";
	const MSGTYP_UNSUPP = "unsupported";

	let port: ProperPort;

	export function startListeners(): Promise<string[]>
	{
		port = new ProperPort();
		port.connect();

		return new Promise((resolve, reject) => 
		{
			let timer = setTimeout(() => {
				reject("Native app took too long to respond");
			}, 5000);

			getAvailDMs().then((availableDMs) => {
				start();
				resolve(availableDMs);
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
		
	export function sendMessage(msg: NativeMessage){
		port.postMessage(msg);
	}

	/* private stuff */
	
	function getAvailDMs(): Promise<string[]>
	{
		return new Promise((resolve, reject) => {
			try
			{
				port.setOnDisconnect((p: any) => {
					if(p.error){
						reject("Native app port disconnected: " + p.error.message);
					}
					reject("Native app port disconnected");
				});

				port.setOnMessage((response: any) => 
				{
					if(typeof response != 'object'){
						reject("bad response from native app");
					}
					else if (typeof response.type === 'undefined'){
						reject("no response type from native app");
					}
					else if(response.type === MSGTYP_ERR){
						reject("native app error: " + response.content);
					}
					else if(response.type != MSGTYP_AVAIL_DMS){
						reject("bad response type from native app: " + response.type);
					}
					else if(!response.availableDMs){
						reject("bad DM list from native app");
					}
					else{
						resolve(response.availableDMs);
					}
				});

				port.postMessage({type: MSGTYP_GET_AVAIL_DMS});
				
			}
			catch(e){
				reject(e);
			}
		});
	}
	
	function start()
	{
		//set the final handlers
		port.setOnMessage(doOnNativeMessage);
		port.setOnDisconnect((p:any) => {
			if(p.error){
				log.warn("Port disconnected: ", p.error.message);
			}
			else{
				log.warn("Port disconnected");
			}
			port.connect();
		});
	}

	/* listener */	
	function doOnNativeMessage(msg: NativeMessage)
	{
		if(msg.type === MSGTYP_YTDL_INFO)
		{
			handleYTDLInfo(msg as MSGRCV_YTDLInfo);
		}

		else if(msg.type === MSGTYP_YTDL_COMP)
		{
			handleYTDLComp(msg as MSGRCV_YTDLComp);
		}

		else if(msg.type === MSGTYP_YTDL_FAIL)
		{
			handleYTDLFail(msg as MSGRCV_YTDLFail);
		}

		else if(msg.type === MSGTYP_YTDLPROG)
		{
			handleYTDLProg(msg as MSGRCV_YTDLProg);
		}

		else if(msg.type === MSGTYP_MSG)
		{
			handleGeneral(msg as MSGRCV_General);
		}

		else if(msg.type === MSGTYP_ERR)
		{
			handleError(msg as MSGRCV_Error);
		}

		else
		{
			log.err('Bad message from native app:', msg);
		}
	}

	/* handlers */
	function handleYTDLInfo(msg: MSGRCV_YTDLInfo)
	{
		log.d('received ytdl info', msg.info);
		
		if(typeof msg.info === 'object')
		{
			let dl = DLG.allDownloads.get(msg.dlHash)!;
			dl.ytdlinfo = msg.info;
			dl.hidden = false;
		}
		else
		{
			log.err("Bad response from YTDL:", msg.info);
		}
	}

	function handleYTDLFail(msg: MSGRCV_YTDLFail)
	{
		let options = {
			type: "basic", 
			title: "Download Grab", 
			message: "Download Failed"
		};
		browser.notifications.create(options);
	}

	function handleYTDLProg(msg: MSGRCV_YTDLProg)
	{
		let percent = msg.percent.split('%')[0];
		let specifier = (typeof msg.dlHash != 'undefined')? msg.dlHash : msg.tabId!;
		let message = new Messaging.MSGYTDLProg(percent, specifier);
		Messaging.sendMessage(message);
	}

	function handleYTDLComp(msg: MSGRCV_YTDLComp)
	{
		let options = {
			type: "basic", 
			title: "Download Grab", 
			message: "Download Complete"
		};
		browser.notifications.create(options);

		let specifier = (typeof msg.dlHash != 'undefined')? msg.dlHash : msg.tabId!;
		let message = new Messaging.MSGYTDLProg('100', specifier);
		Messaging.sendMessage(message);
	}

	function handleGeneral(msg: MSGRCV_General)
	{
		let message = {
			type: "basic", 
			title: "Download Grab", 
			message: msg.content
		};
		browser.notifications.create(message);
	}

	function handleError(msg: MSGRCV_Error)
	{
		log.err('Error in native app:', msg.content);
	}
}