'use strict';

//todo: unicode in headers (content-disposition) is not supported by firefox
//todo: report:  If you send a file to FDM[3] then the filename will be empty, but it'll appear in comments, but that just how FlashGot worked, so I don't know if consider it as a bug or not.
//todo: add context menu for image/audio/video elements
//todo: Grab selection shouldn't appear in context menu when only a simple text is selected
//todo: option to only keep download history of current tab
//todo: add private browsing downloads to a separate list
//todo: optimize filters order
//todo: add option to download everything with DM if forcedownload is '*'
//todo: add try/catch to all awaits
//todo: show location bar icon when media is grabbed in page
//todo: script injection needed for grab selection/all doens't work on addon pages (Video Downloader Prime)
//todo: add option to automatically download with default DM is size is bigger than X
//todo: reduce duplicates in download list (find out if it's the same file using size? etc.)

var DEBUG = true;

(async () => {

	console.log('initializing app...');

	try{

		await DG.NativeUtils.initialize();
		let availableDMs = await DG.NativeUtils.getAvailableDMs();
		DG.Options.initialize(availableDMs);
		let options = await DG.Options.loadProcessed();
		let app = new DlGrabApp(options);
		app.runtime.availableDMs = availableDMs;

		//todo: fix this
		let res = await browser.storage.local.get({blacklist: []});
		app.runtime.blacklist = res.blacklist;

		//todo: bejaye inke hame ina global bashan har kodoom ye class bashan va tooye contructor
		//har kodoom az oonaye dige ro ke ina behesh dipendent hastan bedim
		//injoori mifahmim kodoom be kodoom dependent hast va tartib kharab nemishe
		DG.Messaging.initialize(app);
		DG.RequestHandling.initialize(app);
		DG.ContextMenu.initialize(app);
		console.log('app init successful');
	}catch(e){
		console.log('app could not be initialized: ', e);
		//todo: remove notifications or make them look good
		let options = {
			type: "basic", 
			title: "Download Grab", 
			message: "ERROR: initialization failed\nReason: " + e.toString(),
		};
		browser.notifications.create(options);		
		return;
	}

})();