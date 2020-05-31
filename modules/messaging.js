class Messaging {

	/**
	 * @param {DlGrabApp} app 
	 * @param {Options} opMan 
	 */
	constructor(app, opMan){
		this.app = app;
		this.opMan = opMan;
	}

	init(){
		browser.runtime.onMessage.addListener((msg)=>{return this.doOnMessage(msg, this.app, this.opMan)});
	}

	 /**
	 * Runs when a message is received from a script
	  * @param {object} message 
	  * @param {DlGrabApp} app 
	  * @param {Options} opMan 
	  */
	doOnMessage(message, app, opMan) {

		console.log('message received:' + JSON.stringify(message));

		if(message.type === Messaging.TYP_SAVE_OPTIONS){
			Options.save(message.options);
			//set options
			app.applyOptions(message.options);
			console.log('saved options: ', app.options);
		}
		else if(message.type === Messaging.TYP_LOAD_OPTIONS){
			return opMan.loadWithData();
		}
		else if(message.type === Messaging.TYP_CLEAR_LIST){
			app.allDownloads = new FixedSizeMap(app.options.dlListSize);
		}
		else if(message.type === Messaging.TYP_GET_BG_DATA){
			let data = {downloads: app.allDownloads, appJSON: app};
			return Promise.resolve(data);
		}
		else if(message.type === Messaging.TYP_DL_DIALOG_CLOSING){
			delete app.downloadDialogs[message.windowId];
			if(message.continueWithBrowser){
				return;
			}
			let download = app.allDownloads.get(message.downloadHash);
			if(download.resolve){
				download.resolve({cancel: true});
			}
			//todo: new tabs that are not blank do not get closed: https://jdownloader.org/download/index
			//if we are not continuing with browser then close the empty tab
			let downloadPageTabId = message.downloadPageTabId;
			browser.tabs.get(downloadPageTabId).then((tabInfo)=>{
				if(tabInfo.url === "about:blank"){
					console.log('closing tab: ', tabInfo);
					browser.tabs.remove(tabInfo.id);
				}
			});
		}
		else if(message.type === Messaging.TYP_CONT_WITH_BROWSER){
			let download = app.allDownloads.get(message.downloadHash);
			if(download.resolve){
				download.resolve({cancel: false});
			}
		}
		//todo: unused
		else if(message.type === Messaging.TYP_INTERCEPT_DL){
			let download = app.allDownloads.get(message.downloadHash);
			if(download.resolve){
				download.resolve({cancel: true});
			}
		}
		else if(message.type === Messaging.TYP_DOWNLOAD){
			let download = app.allDownloads.get(message.downloadHash);
			NativeUtils.downloadSingle(message.dmName, download);
		}
		else if(message.type === Messaging.TYP_DL_REPORTED){
			let download = app.allDownloads.get(message.downloadHash);
			download.reported = true;
			app.runtime.blacklist.push(download.url);
			browser.storage.local.set({blacklist: app.runtime.blacklist});
		}

		return Promise.resolve();

	}

}

Messaging.TYP_SAVE_OPTIONS= 'save-options';
Messaging.TYP_CLEAR_LIST= 'clear-list';
Messaging.TYP_GET_BG_DATA= 'get-bg';
Messaging.TYP_DL_DIALOG_CLOSING= 'dl-gialog-closing';
Messaging.TYP_CONT_WITH_BROWSER= 'con-with-browser';
Messaging.TYP_INTERCEPT_DL= 'intercept-dl';
Messaging.TYP_DOWNLOAD= 'download';
Messaging.TYP_DL_REPORTED= 'dl-reported';
Messaging.TYP_LOAD_OPTIONS= 'load-options';
Messaging.TYP_GET_OPTS_DATA= 'get-options-data';