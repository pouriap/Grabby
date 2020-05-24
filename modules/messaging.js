var DG = DG || {};

DG.Messaging = {

	TYP_SAVE_OPTIONS: 'save-options',
	TYP_CLEAR_LIST: 'clear-list',
	TYP_GET_BG_DATA: 'get-bg',
	TYP_DL_DIALOG_CLOSING: 'dl-gialog-closing',
	TYP_CONT_WITH_BROWSER: 'con-with-browser',
	TYP_INTERCEPT_DL: 'intercept-dl',
	TYP_DOWNLOAD: 'download',

	/**
	 * 	
	 * @param {DlGrabApp} app 
	 */
	initialize: function(app){
		this.app = app;
		browser.runtime.onMessage.addListener(this.doOnMessage);
	},

	/**
	 * Runs when a message is received from a script
	 */
	doOnMessage: function(message, sender, sendResponse) {

		console.log('message received:' + JSON.stringify(message));

		var _this = DG.Messaging;

		if(message.type === _this.TYP_SAVE_OPTIONS){
			//set options
			_this.app.applyOptions(message.options);
			console.log('saved options: ', _this.app.options);
		}
		else if(message.type === _this.TYP_CLEAR_LIST){
			_this.app.allDownloads = new FixedSizeMap(_this.app.options.dlListSize);
		}
		else if(message.type === _this.TYP_GET_BG_DATA){
			let data = {downloads: _this.app.allDownloads, appJSON: _this.app};
			return Promise.resolve(data);
		}
		else if(message.type === _this.TYP_DL_DIALOG_CLOSING){
			delete _this.app.downloadDialogs[message.windowId];
			if(message.continueWithBrowser){
				return;
			}
			let download = _this.app.allDownloads.get(message.downloadHash);
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
		else if(message.type === _this.TYP_CONT_WITH_BROWSER){
			let download = _this.app.allDownloads.get(message.downloadHash);
			if(download.resolve){
				download.resolve({cancel: false});
			}
		}
		//todo: unused
		else if(message.type === _this.TYP_INTERCEPT_DL){
			let download = _this.app.allDownloads.get(message.downloadHash);
			if(download.resolve){
				download.resolve({cancel: true});
			}
		}
		else if(message.type === _this.TYP_DOWNLOAD){
			let download = _this.app.allDownloads.get(message.downloadHash);
			DG.NativeUtils.downloadSingle(message.dmName, download);
		}

		return Promise.resolve();

	}

}