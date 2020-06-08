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

//constructor faghat variable va init dashte bashim
//this haye dakhele promise ha va callback ha check shavad 
//chizhaii ke bayad static bashad check shavad mesle port dr NativeUtils

(async () => {

	console.log('initializing app...');

	try{

		let nativeUtils = new NativeUtils();
		await nativeUtils.init();

		let availableDMs = await nativeUtils.getAvailableDMs();
		let browserDms = await DMHelper.getAvailableDMs();
		if(browserDms.length){
			availableDMs.push(browserDms);
		}

		let opMan = new Options(availableDMs);

		let app = new DlGrabApp(availableDMs);
		await app.init();


		//todo: fix this
		let res = await browser.storage.local.get({blacklist: []});
		app.runtime.blacklist = res.blacklist;


		let messaging = new Messaging(app, opMan);
		messaging.init();

		let rHandling = new RequestHandling(app);
		rHandling.init();

		let cMenu = new ContextMenu(app);
		cMenu.init();

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