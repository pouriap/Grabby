'use strict';

var DEBUG = true;

(async () => {

	console.log('initializing app...');

	try{
		let options = await browser.storage.local.get(defaultOptions);
		let app = new DlGrabApp(options);
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