/**
 * This class is used for communication between the popup context and the background context
 * It listens for messages from the popup and does things that are not possible to do in popup
 */

class Messaging {

	static init(){
		browser.runtime.onMessage.addListener( (msg) => { 
			return Messaging.doOnMessage(msg); 
		});
	}

	/**
	 * Convenience static method for sending a browser message
	 * @param {object} msg 
	 * @returns {Promise}
	 */
	static sendMessage(msg)
	{
		return browser.runtime.sendMessage(msg);
	}

	/**
	 * Handles incoming messages
	 * @param {object} message 
	 */
	static doOnMessage(message) 
	{
		//saves options
		if(message.type === Messaging.TYP_SAVE_OPTIONS)
		{
			Options.save(message.options);
			//set options
			Options.apply(message.options);
			log('saved options: ', DLG.options);
		}

		//clears the all downloads list
		else if(message.type === Messaging.TYP_CLEAR_LIST)
		{
			DLG.allDownloads = new FixedSizeMap(DLG.options.dlListSize);
		}

		//gets a copy of DLG global variable
		else if(message.type === Messaging.TYP_GET_DLG)
		{
			let data = {DLGJSON: DLG};
			return Promise.resolve(data);
		}

		//called when DLG download dialog is closing
		//used for cancelling a request we want to handle with download manager
		//also for closing blank tabs that were opened for the download
		else if(message.type === Messaging.TYP_DL_DIALOG_CLOSING)
		{
			delete DLG.downloadDialogs[message.windowId];
			if(message.continueWithBrowser){
				return;
			}
			let download = DLG.allDownloads.get(message.downloadHash);
			if(download.resolve){
				download.resolve({cancel: true});
			}
			//todo: new tabs that are not blank do not get closed: https://jdownloader.org/download/index
			//if this is a download that opens in an empty new tab and we are not 
			//continuing with browser then close the empty tab
			let downloadPageTabId = download.reqDetails.tabId;
			try{
				browser.tabs.get(downloadPageTabId).then((tabInfo)=>{
					if(tabInfo.url === "about:blank"){
						log('closing blank tab: ', tabInfo);
						browser.tabs.remove(tabInfo.id);
					}
				});
			}catch(e){};
		}

		//to continue with browser
		else if(message.type === Messaging.TYP_CONT_WITH_BROWSER)
		{
			let download = DLG.allDownloads.get(message.downloadHash);
			if(download.resolve){
				download.resolve({cancel: false});
			}
		}

		//downloads a download with the specified DM
		else if(message.type === Messaging.TYP_DOWNLOAD)
		{
			let download = DLG.allDownloads.get(message.downloadHash);
			DownloadJob.getFromDownload(message.dmName, download).then((job)=>{
				DLG.doDownloadJob(job);
			});
		}

		//downloads a stream with youtubedl
		else if(message.type === Messaging.TYP_YTDL_GET)
		{
			let download = DLG.allDownloads.get(message.downloadHash);
			let job = YTDLJob.getFromDownload(download, message.formatId, message.ytdlType);
			DLG.doYTDLJob(job);
		}

		//marks a download as reported and adds it to blacklist
		else if(message.type === Messaging.TYP_DL_REPORTED)
		{
			let download = DLG.allDownloads.get(message.downloadHash);
			download.reported = true;
			DLG.blacklist.push(download.url);
			browser.storage.local.set({blacklist: DLG.blacklist});
		}

		return Promise.resolve();

	}

}

Messaging.TYP_SAVE_OPTIONS = 'save-options';
Messaging.TYP_CLEAR_LIST = 'clear-list';
Messaging.TYP_GET_DLG = 'get-bg';
Messaging.TYP_DL_DIALOG_CLOSING = 'dl-gialog-closing';
Messaging.TYP_CONT_WITH_BROWSER = 'con-with-browser';
Messaging.TYP_DOWNLOAD = 'download';
Messaging.TYP_DL_REPORTED = 'dl-reported';
Messaging.TYP_GET_OPTS_DATA = 'get-options-data';
Messaging.TYP_YTDL_GET = 'ytdl-get';
Messaging.TYP_YTDL_PROGRESS = 'ytdl-progress';