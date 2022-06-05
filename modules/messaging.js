class Messaging {

	static init(){
		browser.runtime.onMessage.addListener( (msg) => { 
			return Messaging.doOnMessage(msg); 
		});
	}

	/**
	 * Sends a message
	 * @param {object} msg 
	 * @returns {Promise}
	 */
	static sendMessage(msg)
	{
		return browser.runtime.sendMessage(msg);
	}

	/**
	 * Runs when a message is received from a script
	 * @param {object} message 
	 */
	static doOnMessage(message) 
	{
		if(message.type === Messaging.TYP_SAVE_OPTIONS)
		{
			Options.save(message.options);
			//set options
			Options.apply(message.options);
			log('saved options: ', DLG.options);
		}

		else if(message.type === Messaging.TYP_CLEAR_LIST)
		{
			DLG.allDownloads = new FixedSizeMap(DLG.options.dlListSize);
		}

		else if(message.type === Messaging.TYP_GET_DLG)
		{
			let data = {DLGJSON: DLG};
			return Promise.resolve(data);
		}

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
			browser.tabs.get(downloadPageTabId).then((tabInfo)=>{
				if(tabInfo.url === "about:blank"){
					log('closing tab: ', tabInfo);
					browser.tabs.remove(tabInfo.id);
				}
			});
		}

		else if(message.type === Messaging.TYP_CONT_WITH_BROWSER)
		{
			let download = DLG.allDownloads.get(message.downloadHash);
			if(download.resolve){
				download.resolve({cancel: false});
			}
		}

		//todo: unused
		else if(message.type === Messaging.TYP_INTERCEPT_DL)
		{
			let download = DLG.allDownloads.get(message.downloadHash);
			if(download.resolve){
				download.resolve({cancel: true});
			}
		}

		else if(message.type === Messaging.TYP_DOWNLOAD)
		{
			let download = DLG.allDownloads.get(message.downloadHash);
			DownloadJob.getFromDownload(message.dmName, download).then((job)=>{
				Utils.performJob(job);
			});
		}

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
Messaging.TYP_INTERCEPT_DL = 'intercept-dl';
Messaging.TYP_DOWNLOAD = 'download';
Messaging.TYP_DL_REPORTED = 'dl-reported';
Messaging.TYP_GET_OPTS_DATA = 'get-options-data';