declare var browser: webx_browser;
declare var chrome: webx_chrome;
declare var filesize: any;
declare var md5: any;
declare var fflate: any;

//todo: unicode in headers (content-disposition) is not supported by firefox [is it added? https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/HttpHeaders]
//todo: report:  If you send a file to FDM[3] then the filename will be empty, but it'll appear in comments, but that just how FlashGot worked, so I don't know if consider it as a bug or not.
//todo: add context menu for image/audio/video elements
//todo: Grab selection shouldn't appear in context menu when only a simple text is selected
//todo: option to only keep download history of current tab
//todo: optimize filters order
//todo: add option to download everything with DM if forcedownload is '*'
//todo: add try/catch to all awaits
//todo: script injection needed for grab selection/all doens't work on addon pages (Video Downloader Prime)
//todo: add option to automatically download with default DM if size is bigger than X
//todo: is blob and/or encrypted downloads possible to detect? Telegram/Mega/FF Send
//todo: support wildcard in blacklisted domains
//todo: add keyboard shortcuts
//todo: option to show only downloads of this page/all dls
//todo: ability to grab a NoScript blocked media item? 'therube' post on forum
//todo: grab selection doesn't work properly here -> https://dl1.filmiokgzr.site/Cartoon/3/Kobayashi-san%20Chi%20no%20Maid%20Dragon/S2/480/
//todo: store options in sync
//todo: save downloads list
//todo: check licenses for all included files here and in the C++ code
//todo: could be useful: https://github.com/streamlink/streamlink
//todo: policies: https://extensionworkshop.com/documentation/publish/add-on-policies/
//todo: how firefox determines mime types: https://developer.mozilla.org/en-US/docs/Mozilla/How_Mozilla_determines_MIME_Types
//todo: I18N
//todo: option to do this automatically for files like this from now on
//todo: add curl and wget commands
//todo: config file for ytdl?
//todo: ytdl -N, --concurrent-fragments N option
//todo: ytdl --postprocessor-args NAME:ARGS option
//todo: make download list look like firefox download list
//todo: wtf is this?
//media type is anything that is loaded from a <video> or <audio> tag
//the problem with them is that if they are cached, there is absolutely no way to re-create
//the request and trigger a grab
//i expected a request to be created with 'fromCache=true' but that is not the case
//i tried ctrl+f5 and disabling cache from network tool but they don't work
//the request doesn't even show up in the network tool
//proof: MDN or w3schools page on <video> and <audio> tag
//the only way is to open the page containing the resouce in a private window
//todo: add filters based on file type on filter dialog
//todo: HEAD files in filter dialog
//todo: when a url is unsupported fall back to general manifest grabbing (pornzog.com)
//todo: single format mp4 is not grabbed (https://hclips.com/videos/7485065/lily-s-first-tickle-session/)

var GB = new Grabby();
var nativeMinVer = '0.61.0';

(async () => {

	log.d('initializing addon...');

	try
	{
		//get browser info
		let info = await Utils.browserInfo();
		GB.browser = info;

		//get the native app version (also makes sure native app is present)
		let version = await NativeMessaging.getVersion();

		log.d('native app version is', version);

		if(Utils.compareVersion(version, nativeMinVer) < 0)
		{
			throw new NativeAppVersionError();
		}

		//get available DMs from flashgot
		let externalDMs = await NativeMessaging.getAvailableDMs();

		log.d('available dms are', externalDMs);

		//these are TCP server based DMs that we check using the browser itself
		let browserDms = await BrowserDMs.getAvailableDMs();

		let availableDMs: string[] = externalDMs.concat(browserDms);

		if(availableDMs.length > 0)
		{
			GB.availableDMs = availableDMs;
			GB.availBrowserDMs = browserDms;
			GB.availExtDMs = externalDMs;
		}

		await Options.load(availableDMs);

		NativeMessaging.startListeners();

		Tabs.startListeners();

		Messaging.startListeners();

		RequestFiltering.startListeners();

		ContextMenu.startListeners();

		log.d('addon init successful');
	}
	catch(e)
	{
		if(e instanceof NativeMessaging.InitializationError)
		{
			Utils.notification("Error", "Could not connect to native app.\n\nHave you installed the Grabby Toolkit?");
			log.err('Native App not found');
		}
		else if(e instanceof NativeAppVersionError)
		{
			Utils.notification("Error", "The installed native application is outdated and will not work with the current version of Grabby.\n\nPlease update Grabby Toolkit to the latest version.");
			log.err('Native App not found');
		}
		else
		{
			Utils.notification("Error", "Initialization failed\nReason: " + e.toString());
			log.err('Addon could not be initialized:', e);
		}
	}

})();