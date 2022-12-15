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
				this._port = browser.runtime.connectNative(GB_ADDON_ID);
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

	/* constants */
	const GB_ADDON_ID = "grabby.pouriap";

	const MSGTYP_GET_AVAIL_DMS = "get_available_dms";
	const MSGTYP_AVAIL_DMS = "available_dms";
	const MSGTYP_DOWNLOAD = "download";

	const MSGTYP_YTDL_INFO = "ytdl_info";
	const MSGTYP_YTDL_INFO_YTPL = "ytdl_info_ytpl";
	const MSGTYP_YTDL_GET = "ytdl_get";
	const YTDLTYP_VID = "ytdl_video";
	const YTDLTYP_AUD = "ytdl_audio";
	const YTDLTYP_PLVID = "ytdl_video_playlist";
	const YTDLTYP_PLAUD = "ytdl_audio_playlist";
	const MSGTYP_YTDLPROG = "ytdl_progress";
	const MSGTYP_YTDL_COMP = "ytdl_comp";
	const MSGTYP_YTDL_FAIL = "ytdl_fail";
	const MSGTYP_YTDL_KILL = "ytdl_kill";

	const MSGTYP_ERR = "app_error";
	const MSGTYP_MSG = "app_message";
	const MSGTYP_UNSUPP = "unsupported";


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

	abstract class MSG_YTDLBase implements NativeMessage
	{
		abstract type: string;
		proxy?: string;
		constructor(){
			if(Options.opt.ytdlProxy) this.proxy = Options.opt.ytdlProxy;
		}
	}

	export class MSG_YTDLInfo extends MSG_YTDLBase
	{
		type = MSGTYP_YTDL_INFO;
		constructor(public url: string, public dlHash: string){
			super();
		};
	}

	export class MSG_YTDLVideo extends MSG_YTDLBase
	{
		type = MSGTYP_YTDL_GET;
		subtype = YTDLTYP_VID;
		constructor(public url: string, public filename: string, public dlHash: string,
			public formatId: string){
				super();
			};
	}

	export class MSG_YTDLAudio extends MSG_YTDLBase
	{
		type = MSGTYP_YTDL_GET;
		subtype = YTDLTYP_AUD;
		constructor(public url: string, public filename: string, public dlHash: string){
			super();
		};
	}

	export class MSG_YTDLVideoPL extends MSG_YTDLBase
	{
		type = MSGTYP_YTDL_GET;
		subtype = YTDLTYP_PLVID;
		constructor(public url: string, public indexes: string, public dlHash: string,
			public res: string){
			super();
		}
	}

	export class MSG_YTDLAudioPL extends MSG_YTDLBase
	{
		type = MSGTYP_YTDL_GET;
		subtype = YTDLTYP_PLAUD;
		constructor(public url: string, public indexes: string, public dlHash: string){
			super();
		}
	}

	export class MSG_YTDLKill implements NativeMessage
	{
		type = MSGTYP_YTDL_KILL;
		constructor(public dlHash: string){};
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

	type MSGRCV_YTDLInfoYTPL = {
		type: string,
		dlHash: string,
		info: ytdlinfo_ytplitem[];
	}

	type MSGRCV_YTDLComp = {
		type: string,
		dlHash: string
	}

	type MSGRCV_YTDLFail = MSGRCV_YTDLComp;

	type MSGRCV_YTDLKill = MSGRCV_YTDLComp;

	type MSGRCV_YTDLProg = {
		type: string,
		dlHash: string,
		percent_str: string,
		speed_str: string,
		playlist_index: string
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
		log.d('sending', msg);
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
		if(msg.type === MSGTYP_YTDLPROG)
		{
			handleYTDLProg(msg as MSGRCV_YTDLProg);
		}

		else if(msg.type === MSGTYP_YTDL_INFO)
		{
			handleYTDLInfo(msg as MSGRCV_YTDLInfo);
		}

		else if(msg.type === MSGTYP_YTDL_INFO_YTPL)
		{
			handleYTDLInfoYTPL(msg as MSGRCV_YTDLInfoYTPL);
		}

		else if(msg.type === MSGTYP_YTDL_COMP)
		{
			handleYTDLComp(msg as MSGRCV_YTDLComp);
		}

		else if(msg.type === MSGTYP_YTDL_FAIL)
		{
			handleYTDLFail(msg as MSGRCV_YTDLFail);
		}

		else if(msg.type === MSGTYP_YTDL_KILL)
		{
			handleYTDLKill(msg as MSGRCV_YTDLKill);
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
			let dl = GB.allDownloads.get(msg.dlHash) as StreamDownload;
			dl.updateData(msg.info);
			dl.hidden = false;

			if(GB.browser.name === 'firefox')
			{
				browser.pageAction.show(dl.ownerTabId);
			}
		}
		else
		{
			log.err("Bad response from YTDL:", msg.info);
		}
	}

	function handleYTDLInfoYTPL(msg: MSGRCV_YTDLInfoYTPL)
	{
		log.d('received ytdl info', msg.info);
		
		if(typeof msg.info === 'object')
		{
			let dl = GB.allDownloads.get(msg.dlHash) as YTPlaylistDownload;
			dl.updateData(msg.info);
			dl.hidden = false;

			if(GB.browser.name === 'firefox')
			{
				browser.pageAction.show(dl.ownerTabId);
			}
		}
		else
		{
			log.err("Bad response from YTDL:", msg.info);
		}
	}

	function handleYTDLProg(msg: MSGRCV_YTDLProg)
	{
		let percent = Number(msg.percent_str);
		let speed = msg.speed_str;
		let plIndex = Number(msg.playlist_index);

		let prog: progress_data = {
			dlHash: msg.dlHash,
			plIndex: plIndex,
			percent: percent,
			speed: speed
		};

		let dl = GB.allDownloads.get(msg.dlHash)!;
		dl.updateProgress(prog);

		//re-send the progress as an internal message so that any
		//popup/window can receive it and update itself
		let internalMsg = new Messaging.MSGYTDLProg(prog);
		//exception happens when no listener is set for progress, we just ignore it
		Messaging.sendMessage(internalMsg).catch((e) => {});
	}

	function handleYTDLComp(msg: MSGRCV_YTDLComp)
	{
		let dl = GB.allDownloads.get(msg.dlHash)!;
		Utils.notification("Download Complete", dl.filename);
	}

	function handleYTDLFail(msg: MSGRCV_YTDLFail)
	{
		let dl = GB.allDownloads.get(msg.dlHash)!;
		Utils.notification("Download Failed", dl.filename);
	}

	function handleYTDLKill(msg: MSGRCV_YTDLKill)
	{
		let dl = GB.allDownloads.get(msg.dlHash)!;
		Utils.notification("Download Canceled", dl.filename);
	}

	function handleGeneral(msg: MSGRCV_General)
	{
		Utils.notification("Message", msg.content);
	}

	function handleError(msg: MSGRCV_Error)
	{
		log.err('Error in native app:', msg.content);
	}
}