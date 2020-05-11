var Messaging = {

	MSG_SAVE_OPTIONS: 'save-options',
	MSG_CLEAR_LIST: 'clear-list',
	MSG_GET_BG_DATA: 'get-bg',
	MSG_DL_DIALOG_CLOSING: 'dl-gialog-closing',
	MSG_CONT_WITH_BROWSER: 'con-with-browser',
	MSG_INTERCEPT_DL: 'intercept-dl',

	/**
	 * @type {DlGrabApp}
	 */
	app: undefined,

	initialize: function(app){
		this.app = app;
		browser.runtime.onMessage.addListener(this.doOnMessage);
	},

	/**
	 * Runs when a message is received from a script
	 */
	doOnMessage: function(message, sender, sendResponse) {

		console.log('message received:' + JSON.stringify(message));

		var _this = Messaging;

		if(message.type === _this.MSG_SAVE_OPTIONS){
			//set optoins
			_this.app.options = message.options;
			//create a new download list based on options
			_this.app.allDownloads = new FixedSizeMap(options.dlListSize, _this.app.allDownloads.list);
			console.log('saved options: ', _this.app.options);
		}
		else if(message.type === _this.MSG_CLEAR_LIST){
			_this.app.allDownloads = new FixedSizeMap(_this.app.options.dlListSize);
		}
		else if(message.type === _this.MSG_GET_BG_DATA){
			let data = {downloads: _this.app.allDownloads, appJSON: _this.app};
			return Promise.resolve(data);
		}
		else if(message.type === _this.MSG_DL_DIALOG_CLOSING){
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
		else if(message.type === _this.MSG_CONT_WITH_BROWSER){
			let download = _this.app.allDownloads.get(message.downloadHash);
			if(download.resolve){
				download.resolve({cancel: false});
			}
		}
		//todo: unused
		else if(message.type === _this.MSG_INTERCEPT_DL){
			let download = _this.app.allDownloads.get(message.downloadHash);
			if(download.resolve){
				download.resolve({cancel: true});
			}
		}

		return Promise.resolve();

	}

}