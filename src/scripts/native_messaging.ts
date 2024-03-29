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

	export class InitializationError extends Error{}

	/* constants */
	const GB_ADDON_ID = "grabby.pouriap";

	const MSGTYPE_GET_VERSION = "get_version";
	const MSGTYP_GET_AVAIL_DMS = "get_available_dms";
	const MSGTYP_DOWNLOAD = "download";
	const MSGTYP_USER_CMD = "user_cmd";

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
	const MSGTYP_ERR_GUI = "app_error_gui";
	const MSGTYP_MSG = "app_message";
	const MSGTYP_UNSUPP = "unsupported";


	/* sent messages */
	//these are the messsages we send to the native app
	export interface NativeMessage
	{
		type: string;
	}

	class MSG_Getversion implements NativeMessage
	{
		type = MSGTYPE_GET_VERSION;
	}

	class MSG_GetAvailDMs implements NativeMessage
	{
		type = MSGTYP_GET_AVAIL_DMS;
	}

	export class MSG_Download implements NativeMessage
	{
		type = MSGTYP_DOWNLOAD;
		constructor(public job: DownloadJob){};
	}

	export class MSG_UserCMD implements NativeMessage
	{
		type = MSGTYP_USER_CMD;
		constructor(public procName: string, public args: string[], public filename: string, 
			public showConsole: boolean, public showSaveas: boolean){};
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

	type MSGRCV_YTDLInfo = {
		type: string,
		dlHash: string,
		info: ytdlinfo,
	};

	type MSGRCV_YTDLInfoYTPL = {
		type: string,
		dlHash: string,
		info: string;
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

	type MSGRCV_Error_GUI = {
		type: string,
		content: string
	}


	/* now the real stuff */
	
	let port: ProperPort;

	export function startListeners()
	{
		port = new ProperPort();
		port.connect();

		//set the final handlers
		port.setOnMessage(doOnNativeMessage);

		port.setOnDisconnect((p:any) => 
		{
			if(p.error){
				log.warn("Port disconnected: ", p.error.message);
			}
			else{
				log.warn("Port disconnected");
			}
			port.connect();
		});
	}
		
	export function sendMessage(msg: NativeMessage){
		log.d('sending', msg);
		port.postMessage(msg);
	}

	/* private stuff */

	export function getVersion(): Promise<string>
	{
		return new Promise((resolve, reject) => 
		{
			let msg = new MSG_Getversion();
			let sending: Promise<any> = browser.runtime.sendNativeMessage(GB_ADDON_ID, msg);

			let timer = setTimeout(() => {
				let e = new InitializationError("Native app took too long to respond");
				reject(e);
			}, 5000);

			sending.then((response) => 
			{
				if(typeof response == 'object' && typeof response.version === 'string'){
					resolve(response.version);
				}
				else
				{
					let e = new InitializationError("Bad response from native app");
					reject(e);				}
			})
			.catch((reason) => 
			{
				let msg = (typeof reason.msg === 'string')? reason.msg : '';
				let e = new InitializationError(msg);
				reject(e);
			})
			//this will always be called regardless of what happened
			.then(() => {
				clearTimeout(timer);
			});
		});
	}

	export function getAvailableDMs(): Promise<string[]>
	{
		return new Promise((resolve, reject) => 
		{
			let msg = new MSG_GetAvailDMs();
			let sending: Promise<any> = browser.runtime.sendNativeMessage(GB_ADDON_ID, msg);

			sending.then((response) => 
			{
				if(typeof response == 'object' && typeof response.availableDMs === 'object'){
					resolve(response.availableDMs);
				}
				else
				{
					reject('Bad response from native app');
				}
			})
			.catch((reason) => {
				reject(reason);
			});
		});
	}

	/* listener */	
	function doOnNativeMessage(msg: NativeMessage)
	{
		try
		{
			// sue me
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

			else if(msg.type === MSGTYP_ERR_GUI)
			{
				handleErrorGui(msg as MSGRCV_Error_GUI);
			}
	
			else
			{
				log.err('Bad message from native app:', msg);
			}
		}
		catch(e)
		{
			log.err('Error parsing received native message', e);
		}

	}

	/* handlers */
	function handleYTDLInfo(msg: MSGRCV_YTDLInfo)
	{
		log.d('received ytdl info:', msg.info);

		if(typeof msg.info === 'object')
		{
			let dl = GB.allDownloads.get(msg.dlHash) as StreamDownload;
			dl.updateData(msg.info);
			dl.hidden = false;

			if(dl.ownerTabId) Utils.showPageAction(dl.ownerTabId);
		}
		else
		{
			log.warn("bad response from youtube-dl", msg.info);
		}
	}

	function handleYTDLInfoYTPL(msg: MSGRCV_YTDLInfoYTPL)
	{
		log.d('received ytdl playlist info', msg.info);

		try
		{
			let infoStr = Utils.gunzip(msg.info);
			let info = JSON.parse(infoStr);

			let dl = GB.allDownloads.get(msg.dlHash) as YTPlaylistDownload;
			dl.updateData(info);
			dl.hidden = false;

			if(dl.ownerTabId) Utils.showPageAction(dl.ownerTabId);
		}
		catch(e)
		{
			log.err('Could not parse YTDL info', e);
		}
	}

	function handleYTDLProg(msg: MSGRCV_YTDLProg)
	{
		let percent = Number(msg.percent_str);
		let speed = msg.speed_str;
		let plIndex = Number(msg.playlist_index);

		let prog: progress_data = {
			plIndex: plIndex,
			percent: percent,
			speed: speed
		};

		let dl = GB.allDownloads.get(msg.dlHash)!;
		dl.updateProgress(prog);

		//re-send the progress as an internal message so that any
		//popup/window can receive it and update itself
		let status: dl_progress_status = (dl.progress?.status)? dl.progress.status : 'Downloading';
		let progToSend: dl_progress = {percent: prog.percent, speed: prog.speed, status: status};

		let internalMsg = new Messaging.MSGYTDLProg(msg.dlHash, plIndex, progToSend);
		//exception happens when no listener is set for progress, we just ignore it
		Messaging.sendMessage(internalMsg).catch((e) => {});
	}

	function handleYTDLComp(msg: MSGRCV_YTDLComp)
	{
		log.d('download complete', msg);

		let dl = GB.allDownloads.get(msg.dlHash)!;
		Notifs.create("Download Complete", dl.filename);
	}

	function handleYTDLFail(msg: MSGRCV_YTDLFail)
	{
		let dl = GB.allDownloads.get(msg.dlHash)!;
		Notifs.create("Download Failed", dl.filename);
	}

	function handleYTDLKill(msg: MSGRCV_YTDLKill)
	{
		let dl = GB.allDownloads.get(msg.dlHash)!;
		Notifs.create("Download Canceled", dl.filename);
	}

	function handleGeneral(msg: MSGRCV_General)
	{
		Notifs.create("Message", msg.content);
	}

	function handleError(msg: MSGRCV_Error)
	{
		log.err('Error in native app:', msg.content);
	}

	function handleErrorGui(msg: MSGRCV_Error_GUI)
	{
		Notifs.create("Error", msg.content);
	}
}