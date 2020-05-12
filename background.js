'use strict';

var DEBUG = true;

(async () => {

	console.log('initializing app...');

	try{
		let options = await browser.storage.local.get(defaultOptions);
		let app = new DlGrabApp(options);
		await app.initialize();
		DG.Messaging.initialize(app);
		DG.RequestHandling.initialize(app);
		DG.ContextMenu.initialize(app);
		console.log('app init successful');
	}catch(e){
		console.log('app could not be initialized: ', e);
		//todo: remove notifications or make them look good
		let options = {type: "basic", title: "Download Grab", message: "ERROR: Download Grab could not be initialized"};
		browser.notifications.create(options);		
		return;
	}

})();