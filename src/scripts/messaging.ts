/**
 * This namespace is used for communication between the popup context and the background context
 * It listens for messages from the popup and does things that are not possible to do in popup
*/
namespace Messaging
{
	const TYP_SAVE_OPTIONS = 'save-options';
	const TYP_CLEAR_LIST = 'clear-list';
	const TYP_GET_GB = 'get-bg';
	const TYP_GBJSON = 'gb-json';
	const TYP_DL_DIALOG_CLOSING = 'dl-gialog-closing';
	const TYP_UPDATE_VID_THUMB = 'update-video-thumb';
	const TYP_DOWNLOAD = 'download';
	const TYP_YTDL_VIDEO = 'ytdl-video';
	const TYP_YTDL_AUDIO = 'ytdl-audio';
	const TYP_YTDL_VIDEOPL = 'ytdl-playlist-video';
	const TYP_YTDL_AUDIOPL = 'ytdl-playlist-audio';
	const TYP_YTDL_PROG = 'ytdl-progress';
	export const TYP_YTDL_PROGRESS = 'ytdl-progress';


	export interface Message
	{
		type: string;
	}
	
	export class MSGSaveOptions implements Message
	{
		type = TYP_SAVE_OPTIONS;
		constructor(public options: Options.GBOptions){};
	}
	
	export class MSGClearlist implements Message
	{
		type = TYP_CLEAR_LIST;
	}
	
	export class MSGGetGB implements Message
	{
		type = TYP_GET_GB;
	}

	export class MSGGBJSON implements Message
	{
		type = TYP_GBJSON;
		constructor(public GBJSON: GBJSON){};
	}
	
	export class MSGDlDialogClosing implements Message
	{
		type = TYP_DL_DIALOG_CLOSING;
		constructor(public continueWithBrowser: boolean, 
			public dlHash: string){};
	}

	export class MSGUpdateVideoThumb implements Message
	{
		type = TYP_UPDATE_VID_THUMB;
		constructor(public dlHash: string, public data: string){};
	}
	
	export class MSGDownload
	{
		type = TYP_DOWNLOAD;
		constructor(public job: DownloadJob){};
	}

	/**
	 * calls YTDL and gives it a URL and a format ID to download
	 * the format ID is retrieved from a YTDL info data
	 */
	export class MSGYTDLVideo
	{
		type = TYP_YTDL_VIDEO;
		constructor(public url: string, public filename: string, public dlHash: string,
			public formatId: string){};
	}

	export class MSGYTDLAudio
	{
		type = TYP_YTDL_AUDIO;
		constructor(public url: string, public filename: string, public dlHash: string){};
	}

	export class MSGYTDLVideoPL
	{
		type = TYP_YTDL_VIDEOPL;
		constructor(public url: string, public indexes: string[], public dlHash: string,
			public res: string){};
	}

	export class MSGYTDLAudioPL
	{
		type = TYP_YTDL_AUDIOPL;
		constructor(public url: string, public indexes: string[], public dlHash: string){};
	}

	export class MSGYTDLProg
	{
		type = TYP_YTDL_PROG;
		constructor(public progress: progress_data){};
	}


	export function startListeners()
	{
		browser.runtime.onMessage.addListener((msg: Message) => { 
			return doOnMessage(msg);
		});
	}

	/**
	 * Convenience function for sending a browser message
	 * @param msg
	 * @returns 
	 */
	export function sendMessage(msg: object): Promise<Message>
	{
		return browser.runtime.sendMessage(msg);
	}

	/* private stuff */

	/* listener */
	function doOnMessage(msg: Message): Promise<any>
	{
		//saves options
		if(msg.type === TYP_SAVE_OPTIONS)
		{
			handleSaveOptions(msg as MSGSaveOptions);
		}

		//clears the all downloads list
		else if(msg.type === TYP_CLEAR_LIST)
		{
			handleClearList(msg as MSGClearlist);
		}

		//gets a copy of GB global variable
		else if(msg.type === TYP_GET_GB)
		{
			return handleGetGB(msg as MSGGetGB);
		}

		//called when download dialog is closing
		//used for cancelling a request we want to handle with download manager
		//also for closing blank tabs that were opened for the download
		else if(msg.type === TYP_DL_DIALOG_CLOSING)
		{
			handleDLDialog(msg as MSGDlDialogClosing);
		}

		else if(msg.type === TYP_UPDATE_VID_THUMB)
		{
			handleVideoThumb(msg as MSGUpdateVideoThumb);
		}

		//downloads a download with the specified DM
		else if(msg.type === TYP_DOWNLOAD)
		{
			handleDownload(msg as MSGDownload);
		}

		//downloads a video url
		else if(msg.type === TYP_YTDL_VIDEO)
		{
			handleYTDLVideo(msg as MSGYTDLVideo);
		}

		else if(msg.type === TYP_YTDL_AUDIO)
		{
			handleYTDLAudio(msg as MSGYTDLAudio);
		}

		else if(msg.type === TYP_YTDL_VIDEOPL)
		{
			handleYTDLVideoPL(msg as MSGYTDLVideoPL);
		}

		else if(msg.type === TYP_YTDL_AUDIOPL)
		{
			handleYTDLAudioPL(msg as MSGYTDLVideoPL);
		}

		else
		{
			log.warn("unhandled message type", msg);
		}

		return Promise.resolve();

	}

	/* handlers */

	function handleSaveOptions(msg: MSGSaveOptions)
	{
		let saving = Options.save(msg.options);
		saving.then((error) => {
			if(error) log.err('saving options failed: ', error, msg.options);
			else log.d('options saved: ', msg.options);
		});
	}

	function handleClearList(msg: MSGClearlist)
	{
		GB.allDownloads.clear();
	}

	function handleGetGB(msg: MSGGetGB): Promise<MSGGBJSON>
	{
		return new Promise((resolve) => {
			let json: GBJSON = {
				allDownloads: Utils.mapToArray(GB.allDownloads),
				tabs: Utils.mapToArray(GB.tabs),
				options: Options.opt,
				availableDMs: GB.availableDMs,
				browser: GB.browser,
			}
			resolve(new MSGGBJSON((json)));
		});
	}

	//this message is received when download dialog is closing
	function handleDLDialog(msg: MSGDlDialogClosing)
	{
		let download = GB.allDownloads.get(msg.dlHash)!;

		if(!isResolvable(download) || !download.resolveRequest)
		{
			log.err('download does not have resolve', download);
		}

		if(msg.continueWithBrowser){
			download.resolveRequest({cancel: false});
			return;
		}

		download.resolveRequest({cancel: true});

		//if this is a download that opens in an empty new tab and we are not 
		//continuing with browser then close the empty tab manually
		//todo: new tabs that are not blank do not get closed: https://jdownloader.org/download/index
		if(typeof download.tabId != 'undefined')
		{
			let dlTab = GB.tabs.getsure(download.tabId);
			if(dlTab.url === "about:blank")
			{
				log.d('closing blank tab: ', dlTab);
				browser.tabs.remove(dlTab.id).catch((e) => {});
			}
		}
	}

	function handleVideoThumb(msg: MSGUpdateVideoThumb)
	{
		let dl = GB.allDownloads.get(msg.dlHash) as VideoDownload;
		dl.thumbData = msg.data;
	}

	function handleDownload(msg: MSGDownload)
	{
		GB.doDownloadJob(msg.job);
	}

	function handleYTDLVideo(msg: MSGYTDLVideo)
	{
		let nmsg = new NativeMessaging.MSG_YTDLVideo(msg.url, msg.filename, msg.dlHash, msg.formatId);
		NativeMessaging.sendMessage(nmsg);
	}

	function handleYTDLAudio(msg: MSGYTDLAudio)
	{
		let nmsg = new NativeMessaging.MSG_YTDLAudio(msg.url, msg.filename, msg.dlHash);
		NativeMessaging.sendMessage(nmsg);
	}

	function handleYTDLVideoPL(msg: MSGYTDLVideoPL)
	{
		let indexes = msg.indexes.join(',');
		let nmsg = new NativeMessaging.MSG_YTDLVideoPL(msg.url, indexes, msg.dlHash, msg.res);
		NativeMessaging.sendMessage(nmsg);
	}

	function handleYTDLAudioPL(msg: MSGYTDLAudioPL)
	{
		let indexes = msg.indexes.join(',');
		let nmsg = new NativeMessaging.MSG_YTDLAudioPL(msg.url, indexes, msg.dlHash);
		NativeMessaging.sendMessage(nmsg);
	}

}