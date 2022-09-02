/**
 * This namespace is used for communication between the popup context and the background context
 * It listens for messages from the popup and does things that are not possible to do in popup
*/
namespace Messaging
{
	const TYP_SAVE_OPTIONS = 'save-options';
	const TYP_CLEAR_LIST = 'clear-list';
	const TYP_GET_DLG = 'get-bg';
	const TYP_DLGJSON = 'dlg-json';
	const TYP_DL_DIALOG_CLOSING = 'dl-gialog-closing';
	const TYP_CONT_WITH_BROWSER = 'con-with-browser';
	const TYP_DOWNLOAD = 'download';
	const TYP_DL_REPORTED = 'dl-reported';
	const TYP_GET_OPTS_DATA = 'get-options-data';
	const TYP_YTDL_GET = 'ytdl-get';
	export const TYP_YTDL_PROGRESS = 'ytdl-progress';


	export interface Message
	{
		type: string;
	}
	
	export class MSGSaveOptions implements Message
	{
		type = TYP_SAVE_OPTIONS;
		constructor(public options: Options.DLGOptions){};
	}
	
	export class MSGClearlist implements Message
	{
		type = TYP_CLEAR_LIST;
	}
	
	export class MSGGetDLG implements Message
	{
		type = TYP_GET_DLG;
	}

	export class MSGDLGJSON implements Message
	{
		type = TYP_DLGJSON;
		constructor(public DLGJSON: DLGJSON){};
	}
	
	export class MSGDlDialogClosing implements Message
	{
		type = TYP_DL_DIALOG_CLOSING;
		constructor(public continueWithBrowser: boolean, 
			public dlHash: string, public windowId: number){};
	}
	
	export class MSGContWithBrowser
	{
		type = TYP_CONT_WITH_BROWSER;
		constructor(public dlhash: string){};
	}
	
	export class MSGDownload
	{
		type = TYP_DOWNLOAD;
		constructor(public dlHash: string, public dmName: string){};
	}
	
	export class MSGYTDLGet
	{
		type = TYP_YTDL_GET;
		constructor(public dlHash: string, public formatId: number, public ytdlType: string){};
	}

	export class MSGYTDLProg
	{
		type = TYP_YTDL_PROGRESS;
		constructor(public dlHash: string, public percent: string){};
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

		//gets a copy of DLG global variable
		else if(msg.type === TYP_GET_DLG)
		{
			return handleGetDLG(msg as MSGGetDLG);
		}

		//called when DLG download dialog is closing
		//used for cancelling a request we want to handle with download manager
		//also for closing blank tabs that were opened for the download
		else if(msg.type === TYP_DL_DIALOG_CLOSING)
		{
			handleDLDialog(msg as MSGDlDialogClosing);
		}

		//to continue with browser
		else if(msg.type === TYP_CONT_WITH_BROWSER)
		{
			handleContinue(msg as MSGContWithBrowser);
		}

		//downloads a download with the specified DM
		else if(msg.type === TYP_DOWNLOAD)
		{
			handleDownload(msg as MSGDownload);
		}

		//downloads a stream with youtubedl
		else if(msg.type === TYP_YTDL_GET)
		{
			handleYTDLGet(msg as MSGYTDLGet);
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
		DLG.allDownloads.clear();
	}

	function handleGetDLG(msg: MSGGetDLG): Promise<MSGDLGJSON>
	{
		return new Promise((resolve) => {
			let json: DLGJSON = {
				allDownloads: Utils.mapToArray(DLG.allDownloads),
				downloadDialogs: Utils.mapToArray(DLG.downloadDialogs),
				tabs: Utils.mapToArray(DLG.tabs),
				options: Options.opt,
				availableDMs: DLG.availableDMs,
			}
			resolve(new MSGDLGJSON((json)));
		});
	}

	function handleDLDialog(msg: MSGDlDialogClosing)
	{
		DLG.downloadDialogs.delete(msg.windowId);
		if(msg.continueWithBrowser){
			return;
		}
		let download = DLG.allDownloads.get(msg.dlHash)!;

		if(download.resolveRequest){
			download.resolveRequest({cancel: true});
		}

		//if this is a download that opens in an empty new tab and we are not 
		//continuing with browser then close the empty tab manually
		//todo: new tabs that are not blank do not get closed: https://jdownloader.org/download/index
		if(typeof download.tabId != 'undefined')
		{
			let dlTab = DLG.tabs.get(download.tabId);
			if(!dlTab)
			{
				log.err(`tab with id ${download.tabId} does not exist`);
			}

			if(dlTab.url === "about:blank")
			{
				log.d('closing blank tab: ', dlTab);
				browser.tabs.remove(dlTab.id).catch((e) => {
					log.err('there was an error closing blank tab', e);
				});
			}
		}

	}

	function handleContinue(msg: MSGContWithBrowser)
	{
		let download = DLG.allDownloads.get(msg.dlhash);
		if(download?.resolveRequest){
			download.resolveRequest({cancel: false});
		}
	}

	function handleDownload(msg: MSGDownload)
	{
		let download = DLG.allDownloads.get(msg.dlHash)!;
		DownloadJob.getFromDownload(msg.dmName, download).then((job)=>{
			DLG.doDownloadJob(job);
		});
	}

	function handleYTDLGet(msg: MSGYTDLGet)
	{
		let download = DLG.allDownloads.get(msg.dlHash)!;
		let job = YTDLJob.getFromDownload(download, msg.formatId, msg.ytdlType);
		DLG.doYTDLJob(job);
	}

}