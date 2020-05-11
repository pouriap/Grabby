'use strict';

var DEBUG = true;

/**
 * a super duper global variable
 * @type {DlGrabApp}
 */
var app;

(async () => {

	console.log('initializing app...');

	try{
		let options = await browser.storage.local.get(defaultOptions);
		app = new DlGrabApp(options);
		await app.initialize();
		Messaging.initialize(app);
		RequestHandler.initialize(app);
		ContextMenu.initialize(app);
		console.log('app init successful');
	}catch(e){
		console.log('app could not be initialized: ', e);
		//todo: show notification?
		return;
	}

})();