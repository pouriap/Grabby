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
		//todo: show notification?
		app.runtime.ready = false;
		return;
	}

	ContextMenu.createMenus(app);

	RequestHandler.initialize(app);

	Messaging.initialize(app);

})();


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