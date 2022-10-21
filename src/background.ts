declare var browser: webx_browser;
declare var filesize: any;
declare var md5: any;

//todo: unicode in headers (content-disposition) is not supported by firefox [is it added? https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/HttpHeaders]
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
//todo: add option to automatically download with default DM if size is bigger than X
//todo: reduce duplicates in downloads history (find out if it's the same file using size? etc.)
//todo: is blob and/or encrypted downloads possible to detect? Telegram/Mega/FF Send
//todo: support wildcard in blacklisted domains
//todo: add more info to dl history
//todo: add shortcuts
//todo: option to show only downloads of this page/all dls
//todo: ability to grab a NoScript blocked media item? 'therube' post on forum
//todo: grab selection doesn't work properly here -> https://dl1.filmiokgzr.site/Cartoon/3/Kobayashi-san%20Chi%20no%20Maid%20Dragon/S2/480/
//todo: store options in sync, what's wrong with me?
//todo: save downloads list
//TODO: check licenses for all included files here and in the C++ code
//todo: could be useful: https://github.com/streamlink/streamlink
//todo: policies:
/*
- Add-ons must only request those permissions that are necessary for function
- Add-ons should avoid including duplicate or unnecessary files
- Add-on code must be written in a way that is reviewable and understandable. 
Reviewers may ask you to refactor parts of the code if it is not reviewable.
- You may include third-party libraries in your extension. In that case, when you upload 
your extension to AMO, you will need to provide links to the library source code.
- The add-on listing should have an easy-to-read description about everything it does, 
and any information it collects. Please consult our best practices guide for creating
 an appealing listing.
 - If the add-on uses native messaging, the privacy policy must clearly disclose which 
information is being exchanged with the native application. Data exchanged with the 
native application must be in accordance with our No Surprises policy.
*/
//todo: how firefox determines mime types:
//https://developer.mozilla.org/en-US/docs/Mozilla/How_Mozilla_determines_MIME_Types
//todo: support "download selection"
//todo: I18N
//todo: option to do this automatically for files like this from now on
//todo: how do we handle redirects?
//todo: add curl and wget commands
//todo: config file for ytdl?
//todo: support proxy for ytdl
//todo: ytdl -N, --concurrent-fragments N option
//todo: ytdl --postprocessor-args NAME:ARGS option
//todo: show tumbnails for streams and mp4s
//todo: show file type thumbnails for downloads
//todo: make download list look like firefox download list
//todo: do private window or new window tabs start from 0 or are they unique?
//todo: show preview of media in download details
//todo: don't make job files for flashgot, send everything with input stream
//todo: use --progress-template for ytdl

var GRB = new Grabby();

(async () => {

	log.d('initializing addon...');

	try
	{
		//get available DMs from flashgot
		let externalDMs = await NativeMessaging.startListeners();

		//these are TCP server based DMs that we check using the browser itself
		let browserDms = await BrowserDMs.getAvailableDMs();

		let availableDMs: string[] = externalDMs.concat(browserDms);

		if(availableDMs.length == 0){
			throw "No download managers found on system";
		}

		GRB.availableDMs = availableDMs;
		GRB.availBrowserDMs = browserDms;
		GRB.availExtDMs = externalDMs;

		await Options.load();

		Tabs.startListeners();

		Messaging.startListeners();

		RequestFiltering.startListeners();

		ContextMenu.startListeners();

		log.d('addon init successful');
	}
	catch(e)
	{
		//todo: remove notifications or make them look good
		let options = {
			type: "basic", 
			title: "Grabby", 
			message: "Error: initialization failed\nReason: " + e.toString(),
		};
		browser.notifications.create(options);
		log.err('Addon could not be initialized:', e);
	}

})();