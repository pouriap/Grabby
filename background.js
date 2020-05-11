'use strict';

var DEBUG = true;

/**
 * a super duper global variable
 * @type {DlGrabApp}
 */
var app;

(async () => {

	let options = await loadOptions();
	app = new DlGrabApp(options);

	console.log('initializing app...');
	try{
		await app.initialize();
		console.log('app init successful');
		app.runtime.ready = true;
	}catch(e){
		console.log('app could not be initialized: ', e);
		app.runtime.ready = false;
		return;
	}

	ContextMenu.createMenus(app);

	RequestHandler.initialize(app);

	browser.runtime.onMessage.addListener(doOnMessage);

})();


/**
 * Runs when a message is received from a script
 */
//todo:add messaging.js like native_utils.js
function doOnMessage(message, sender, sendResponse) {

	console.log('message received:' + JSON.stringify(message));

	if(message.type === "options"){
		saveOptions(message.options);
	}
	else if(message.type === "clear_list"){
		app.allDownloads = new FixedSizeMap(app.options.dlListSize);
	}
	else if(message.type === "get_bg_data"){
		let data = {downloads: app.allDownloads, appJSON: app};
		return Promise.resolve(data);
	}
	else if(message.type === "dl_dialog_closing"){
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
	else if(message.type === "continue_with_browser"){
		let download = app.allDownloads.get(message.downloadHash);
		if(download.resolve){
			download.resolve({cancel: false});
		}
	}
	//todo: unused
	else if(message.type === "intercept_download"){
		let download = app.allDownloads.get(message.downloadHash);
		if(download.resolve){
			download.resolve({cancel: true});
		}
	}

	return Promise.resolve();

}


function loadOptions(){

	let promise = new Promise(function(resolve){

		function doLoadOptions(loadedOptions) {
			console.log("loaded options: ", loadedOptions);
			resolve(loadedOptions);
		}
	
		function onError(error) {
			console.log(`Error getting options: ${error}`);
			resolve(defaultOptions);
		}
	
		let getting = browser.storage.local.get(defaultOptions);
		getting.then(doLoadOptions, onError);

	});

	return promise;
}

function saveOptions(options){
	//set optoins
	app.options = options;
	//create a new download list based on options
	app.allDownloads = new FixedSizeMap(options.dlListSize, app.allDownloads.list);

	console.log('saved options: ', app.options);
}