type DLGJSON =
{
	allDownloads: [key: string, value: object][];
	downloadDialogs: [key: number, value: string][];
	tabs: [key: number, value: any][];
	options: Options.DLGOptions;
	availableDMs: string[];
}

/**
 * Class for the popup DLG instance (DLGPopup)
 */
class DownloadGrabPopup
{
	allDownloads: Map<string, Download>;
	downloadDialogs: Map<number, string>;
	tabs: Map<number, any>;
	options: Options.DLGOptions;
	availableDMs: string[];

	selectedDl: Download | null = null;
	continueWithBrowser = false;
	currTabId = -1;
	currTabUrl = '';

	constructor(dlgJSON: DLGJSON)
	{
		this.allDownloads = this.recreateDownloads(dlgJSON.allDownloads);
		this.downloadDialogs = new Map(dlgJSON.downloadDialogs);
		this.tabs = new Map(dlgJSON.tabs);
		this.availableDMs = dlgJSON.availableDMs;
		this.options = dlgJSON.options;
	}

	private recreateDownloads(allDownloads: [key: string, value: object][]): Map<string, Download>
	{
		let newDownloads = new Map<string, Download>();

		for(let pair of allDownloads)
		{
			let hash = pair[0];
			let downloadJSON = pair[1] as Download;
			let download = new Download(downloadJSON.httpDetails);
			//copy everything from downloadJSON to the new download object
			Object.assign(download, downloadJSON);
			newDownloads.set(hash, download);
		};

		return newDownloads;
	}
}

/**
 * Class for the main DLG instance
 */
class DownloadGrab
{
	allRequests = new Map<string, HTTPDetails>();
	allDownloads = new Map<string, Download>();
	downloadDialogs = new Map<number, string>();
	tabs = new Map<number, any>();
	availableDMs: string[] = [];
	availExtDMs: string[] = [];
	availBrowserDMs: string[] = [];

	addToAllDownloads(download: Download)
	{
		log.d('adding to all downloads: ', download);
		//we do this here because we don't want to run hash on requests we will not use
		let hash = download.hash;
		//we put hash of URL as key to prevent the same URL being added by different requests
		this.allDownloads.set(hash, download);
	}

	/**
	 * opens the download dialog
	 * here's how things happen because WebExtensions suck:
	 * we open the download dialog window
	 * we store the windowId along with the associated download's hash in app.downloadDialogs
	 * after the dialog loads it sends a message to the background script requesting the download hash
	 * background script gives download dialogs the hash based on the windowId 
	 * download dialog gets the Download object from the hash and populates the dialog
	 * before the dialog is closed it sends a message to the background script telling it to delete the hash to free memory
	 */
	showDlDialog(dl: Download)
	{
		var download = dl;
		let screenW = window.screen.width;
		let screenH = window.screen.height;
		let windowW = 480;
		let windowH = 350;
		let leftMargin = (screenW/2) - (windowW/2);
		let topMargin = (screenH/2) - (windowH/2);

		let createData = {
			type: "detached_panel",
			titlePreface: download.filename,
			url: "popup/download.html",
			allowScriptsToClose : true,
			width: windowW,
			height: windowH,
			left: leftMargin,
			top: topMargin
		};
		let creating = browser.windows.create(createData);

		creating.then((windowInfo: any) => {
			let windowId = windowInfo.id;
			this.downloadDialogs.set(windowId, download.hash);
		});
	}

	doDownloadJob(job: DownloadJob)
	{
		if(this.availBrowserDMs.includes(job.dmName))
		{
			BrowserDMs.dms[job.dmName].download(job);
		}
		else
		{
			let msg = new NativeMessaging.MSG_Download(job);
			NativeMessaging.sendMessage(msg);
		}
	}

	doYTDLJob(job: YTDLJob)
	{
		let msg: NativeMessaging.NativeMessage;

		if(job.type === 'video')
		{
			msg = new NativeMessaging.MSG_YTDLVideo(job.url, job.filename, job.dlHash);
		}
		else if(job.type === 'audio')
		{
			msg = new NativeMessaging.MSG_YTDLAUdio(job.url, job.filename, job.dlHash);
		}
		else
		{
			log.err(`job not supported: ${job}`);
		}

		NativeMessaging.sendMessage(msg);
	}
}

/**
 * Class representing a download
 * Basically any web request is a download
 */
class Download
{
	requestId: string;
	url: string;
	statusCode: number;
	time: number;
	resourceType: string;
	origin: string;
	tabId: number;
	httpDetails: HTTPDetails;
	//these are set after processing
	ytdlInfo: any = undefined;
	manifest: MainManifest | undefined = undefined;
	fetchedPlaylists = 0;
	isStream = false;
	hidden = false;
	cat = '';
	class = '';
	classReason = 'no-class-yet';
	//a Promise.resolve object is stored here for downloads that we intercept from the browser
	//calling resolve() on this download will continue the request
	resolve: ((value: unknown) => void) | undefined = undefined;

	private _hash = '';
	private _filename: str_und = undefined;
	private _host: str_und = undefined;
	private _filesize: num_und = undefined;
	private _fileExtension: str_und = undefined;

	/**
	 * Creates a new Download object
	 */
	constructor(details: HTTPDetails)
	{
		this.requestId = details.requestId;
		this.url = details.url;
		this.statusCode = details.statusCode;
		this.time = details.timeStamp;
		this.resourceType = details.type;
		this.origin = details.originUrl || details.url;
		this.tabId = details.tabId;
		this.httpDetails = details;
	}

	get hash()
	{
		if(this._hash === ''){
			this._hash = md5(this.url);
		}
		return this._hash;
	}

	get tabUrl(): string | undefined
	{
		//todo: some things are not associated with a tab and have a -1 id 
		//like service workers (reddit.com)
		//todo: why does this not give an error???!!!
		//return DLG.tabs.get(this.tabId)? DLG.tabs.get(this.tabId) : undefined;

		if(DLG.tabs.get(this.tabId)){
			return DLG.tabs.get(this.tabId).url;
		}
		else{
			return undefined;
		}
	}

	get tabTitle(): string
	{
		return DLG.tabs.get(this.tabId)? DLG.tabs.get(this.tabId).title : 'no-title';
	}

	/**
	 * gets a header associated with this reqeust
	 * @param headerName name of the header
	 * @param headerDirection either "request" or "response"
	 * @returns either the header or undefined
	 */
	getHeader(headerName: string, headerDirection: string): string | undefined
	{
		let headers;
		if(headerDirection === 'request'){
			headers = this.httpDetails.requestHeaders;
		}
		else{
			headers = this.httpDetails.responseHeaders;
		}

		let headerItem =  headers.find(function(header: any){
			return header.name.toLowerCase() === headerName.toLowerCase();
		});

		if(headerItem){
			return headerItem.value;
		}
		else{
			return undefined;
		}
	}

	/**
	 * get file name (if available) of the resouce requested
	 * @returns file name or "unknown" if now available
	 */
	//todo: new getter
	get filename(): string
	{
		if(this.isStream)
		{
			return (this.manifest as MainManifest).title || "unknown";
		}

		if(typeof this._filename === "undefined"){

			this._filename = "unknown";

			let disposition = this.getHeader('content-disposition', 'response');
			if(disposition){
				const regex1 = /filename\*=["']?(.*?\'\')?(.*?)["']?(;|$)/im;
				const regex2 = /filename=["']?(.*?)["']?(;|$)/im;
				//first try filename*= because it takes precedence according to docs
				let matches = disposition.match(regex1);
				if(matches && matches[2]){
					this._filename = decodeURI(matches[2]);
				}
				//then look for filename=
				else{
					matches = disposition.match(regex2);
					if(matches && matches[1]){
						this._filename = decodeURI(matches[1]);
					}
				}

			}
			//use URL if content-disposition didn't provide a file name
			if(this._filename === "unknown"){
				let filename = Utils.getFileName(this.url);
				if(filename){
					this._filename = filename;
				}
			}
			//if the url has no file extension give it a serial number
			//useful for urls like 'media.tenor.com/videos/9dd6603af0ac712c6a38dde9255746cd/mp4'
			//where lots of resources have the same path and hence the same filename
			if(this._filename !== "unknown" && this._filename.indexOf(".") === -1){
				this._filename = this._filename + "_" + this.requestId;
				//try to guess the file extension based on mime type
				let mimeType = this.getHeader('content-type', 'response') || '';
				let extension = constants.mimesToExts[mimeType] as any;
				if(extension){
					this._filename = `${this._filename}.${extension}`;
				}
			}

		}

		return this._filename;
	}

	get host()
	//todo: new getter
	{
		if(typeof this._host === "undefined"){
			this._host = "unknown";
			let host = this.getHeader("host", "request");
			if(host){
				this._host = host;
			}
		}

		return this._host;
	}

	/**
	 * get content-length (if available) of the resource requested
	 * @returns size in MB or -1 if not available
	 */
	//todo: new getter
	get size(){

		if(typeof this._filesize === "undefined"){

			this._filesize = -1; //todo: used to be 'unknown

			let contentLength = this.getHeader("content-length", "response");
			let size = Number(contentLength);
			if(Number.isInteger(size)){
				this._filesize = size;
			}
		}

		return this._filesize;
	}

	/**
	 * gets the extension of the resource requested (if available)
	 * @returns the extension in lower case or "unknown" if no extension if available
	 */
	//todo: new getter
	get fileExtension()
	{
		if(typeof this._fileExtension === "undefined"){

			this._fileExtension = "unknown";

			let ext = Utils.getExtFromFileName(this.filename);
			if(ext){
				this._fileExtension = ext;
			}
		}

		return this._fileExtension;
	}

}

//todo: i'm not loving how this is now coupled with options
/**
 * A class containing all sorts of functions to determine if a request is an 
 * actual download we are interested in
 */
class ReqFilter
{
	//todo: change these to numbers
	//categories of file types
	public static readonly CAT_WEB_RES = 'web res';
	public static readonly CAT_WEBRES_API = 'web res api';
	public static readonly CAT_OTHER_WEB = 'other web';
	public static readonly CAT_OTHERWEB_API = 'other web api';
	public static readonly CAT_MEDIA_API = 'media api';
	public static readonly CAT_FILE_MEDIA = 'media file';
	public static readonly CAT_FILE_COMP = 'compressed file';
	public static readonly CAT_FILE_DOC = 'document file';
	public static readonly CAT_FILE_BIN = 'binary file';
	public static readonly CAT_UKNOWN = 'unknown';

	//classes of requests
	public static readonly CLS_INLINE_WEB_RES = 'web res';
	public static readonly CLS_INLINE_MEDIA = 'web media';
	public static readonly CLS_WEB_OTHER = 'web page';
	public static readonly CLS_DOWNLOAD = 'download';

	private _isWebSocket: bool_und = undefined;
	private _isImage: bool_und = undefined;
	private _isWebImage: bool_und = undefined;
	private _isFont: bool_und = undefined;
	private _isWebFont: bool_und = undefined;
	private _isTextual: bool_und = undefined;
	private _isWebTextual: bool_und = undefined;
	private _isWebResource: bool_und = undefined;
	private _isMedia: bool_und = undefined;
	private _isHlsManifest: bool_und = undefined;
	private _isDashManifest: bool_und = undefined;
	private _isBrowserMedia: bool_und = undefined;
	private _isDisplayedInBrowser: bool_und = undefined;
	private _isCompressed: bool_und = undefined;
	private _isDocument: bool_und = undefined;
	private _isOtherBinary: bool_und = undefined;
	private _hasAttachment: bool_und = undefined;
	private _isAJAX: bool_und = undefined;
	private _isStatusOK: bool_und = undefined;
	private _isExcludedInOpts: bool_und = undefined;
	private _isIncludedInOpts: bool_und = undefined;
	private _isForcedInOpts: bool_und = undefined;
	private _isTypWebRes: bool_und = undefined;
	private _isTypWebOther: bool_und = undefined;
	private _isTypMedia: bool_und = undefined;

	/* constructor */

	constructor(public download: Download, public options: Options.DLGOptions){}

	/* private methods */

	private _isInProtocolList(list: string[])
	{
		for(let protocol of list){
			if(this.download.url.startsWith(protocol)){
				return true;
			}
		}
		return false;
	}

	private _isInExtensionList(list: string[])
	{
		let extension = this.download.fileExtension;
		if (extension !== "unknown" && list.includes(extension)) {
			return true;
		}
		return false;
	}

	private _isInMimeList(list: string[])
	{
		let mime = this.download.getHeader("content-type", "response");
		if (mime){
			mime = mime.toLowerCase();
			for(let listMime of list){
				//we search for the mime's occurence in the content-type because sometimes 
				//content-type has other things in it as well
				if(mime.indexOf(listMime) !== -1){
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * 
	 * @param list list of webRequest.ResourceTypes 
	 */
	private _isInTypeList(list: string[])
	{
		return list.includes(this.download.resourceType);
	}

	
	/* public methods */

	isSizeBlocked()
	{
		let sizeLimit = this.options.grabFilesLargerThanMB * 1000000;
		let size = this.download.size;
		if(size === 0){
			return true;
		}
		return size !== -1 && size < sizeLimit;
	}

	isWebSocket()
	{
		if(typeof this._isWebSocket === 'undefined'){
			this._isWebSocket = 
				this._isInTypeList(constants.webSocketTypes) ||
				this._isInProtocolList(constants.webSocketProtos);
		}
		return this._isWebSocket; 
	}

	isImage()
	{
		if(typeof this._isImage === 'undefined'){
			this._isImage = 
			this._isInTypeList(constants.imageTypes) ||
			this._isInExtensionList(constants.imageExts) ||
			this._isInMimeList(constants.imageMimes);
		}
		return this._isImage;
	}

	isWebImage()
	{
		if(typeof this._isWebImage === 'undefined'){
			this._isWebImage = this._isInTypeList(constants.imageTypes);
		}
		return this._isWebImage;
	}

	isFont()
	{
		if(typeof this._isFont === 'undefined'){
			this._isFont = 
				this._isInTypeList(constants.fontTypes) ||
				this._isInExtensionList(constants.fontExts) ||
				this._isInMimeList(constants.fontMimes);
		}
		return this._isFont;
	}

	isWebFont()
	{
		if(typeof this._isWebFont === 'undefined'){
			this._isWebFont = this._isInTypeList(constants.fontTypes);
		}
		return this._isWebFont;
	}

	isTextual()
	{
		if(typeof this._isTextual === 'undefined'){
			this._isTextual = 
				this._isInTypeList(constants.textualTypes) ||
				this._isInExtensionList(constants.textualExts) ||
				this._isInMimeList(constants.textualMimes);
		}
		return this._isTextual;
	}

	isWebTextual()
	{
		if(typeof this._isWebTextual === 'undefined'){
			this._isWebTextual = false;
			if(this._isInTypeList(constants.textualTypes)){
				this._isWebTextual = true;
			}
			//if its content-type is text/plain then it'll be shown in browser
			//for example seeing a .js file in github raw
			else if(this._isInMimeList(['text/plain'])){
				this._isWebTextual = false;
			}
			else if(
				this._isInExtensionList(constants.textualExts) ||
				this._isInMimeList(constants.textualMimes)
			){
				this._isWebTextual = true;
			}
		}
		return this._isWebTextual;
	}

	isOtherWebResource()
	{
		if(typeof this._isWebResource === 'undefined'){
			this._isWebSocket = this._isInTypeList(constants.otherWebTypes);
		}
		return this._isWebSocket;
	}

	isMedia()
	{
		if(typeof this._isMedia === 'undefined'){
			this._isMedia = 
				//media type is anything that is loaded from a <video> or <audio> tag
				//the problem with them is that if they are cached, there is absolutely no way to re-create
				//the request and trigger a grab
				//i expected a request to be created with 'fromCache=true' but that is not the case
				//i tried ctrl+f5 and disabling cache from network tool but they don't work
				//the request doesn't even show up in the network tool
				//proof: MDN or w3schools page on <video> and <audio> tag
				//the only way is to open the page containing the resouce in a private window
				this._isInExtensionList(constants.mediaExts) ||
				this._isInMimeList(constants.mediaMimes);
		}
		return this._isMedia;
	}

	isHlsManifest()
	{
		if(typeof this._isHlsManifest === 'undefined'){
			this._isHlsManifest = 
				this._isInMimeList(constants.hlsMimes) ||
				this._isInExtensionList(constants.hlsExts);
		}
		return this._isHlsManifest;
	}

	isDashManifest()
	{
		if(typeof this._isDashManifest === 'undefined'){
			this._isDashManifest = 
				this._isInMimeList(constants.dashMimes) ||
				this._isInExtensionList(constants.dashExts);
		}
		return this._isDashManifest;
	}

	isStreamManifest()
	{
		return this.isHlsManifest() || this.isDashManifest();
	}

	isBrowserMedia()
	{
		if(typeof this._isBrowserMedia === 'undefined'){
			this._isBrowserMedia = this._isInTypeList(constants.mediaTypes);
		}
		return this._isBrowserMedia;
	}

	/**
	 * media file that can be played inside Firefox
	 * reference: https://support.mozilla.org/en-US/kb/html5-audio-and-video-firefox
	 */
	isDisplayedInBrowser()
	{
		if(typeof this._isDisplayedInBrowser === 'undefined'){
			if(!this.options.playMediaInBrowser){
				this._isDisplayedInBrowser = false;
			}
			else{
				this._isDisplayedInBrowser = 
					this._isInTypeList(constants.mediaTypes) ||
					this._isInExtensionList(constants.disPlayableExts) ||
					this._isInMimeList(constants.disPlayableMimes);
			}
		}
		return this._isDisplayedInBrowser;
	}

	isCompressed()
	{
		if(typeof this._isCompressed === 'undefined'){
			this._isCompressed = 
				this._isInExtensionList(constants.compressedExts) ||
				this._isInMimeList(constants.compressedMimes);
		}
		return this._isCompressed;
	}

	isDocument()
	{
		if(typeof this._isDocument === 'undefined'){
			this._isDocument = 
				this._isInExtensionList(constants.documentExts) ||
				this._isInMimeList(constants.documentMimes);
		}
		return this._isDocument;
	}

	isOtherBinary()
	{
		if(typeof this._isOtherBinary === 'undefined'){
			this._isOtherBinary = 
				this._isInExtensionList(constants.binaryExts) ||
				this._isInMimeList(constants.generalBinaryMimes);
		}
		return this._isOtherBinary;
	}

	/**
	 * does this request have an "attachment" header?
	 */
	hasAttachment()
	{
		if(typeof this._hasAttachment === 'undefined'){
			let disposition = this.download.getHeader('content-disposition', 'response');
			//apparently firefox considers requests as download even if attachment is not set
			//and only content-disposition is set
			//example: https://www.st.com/resource/en/datasheet/lm317.pdf even if we tamper
			//content-disposition into something like "blablabla" firefox still shows download dialog
			this._hasAttachment = ( 
				typeof disposition != 'undefined' && 
				disposition.toLowerCase().indexOf("inline") === -1 
			);
		}
		return this._hasAttachment;
	}

	isAJAX()
	{
		if(typeof this._isAJAX === 'undefined'){
			this._isAJAX = this._isInTypeList(constants.ajaxTypes);
		}
		return this._isAJAX;
	}

	isStatusOK()
	{
		if(typeof this._isStatusOK === 'undefined')
		{
			this._isStatusOK = false;

			//OK and Not-Modified are ok
			if(this.download.statusCode == 200 || this.download.statusCode == 304){
				this._isStatusOK = true;
			}
			else if(this.download.statusCode == 206){
				//if server is sending a range while we haven't requested it then it's not OK
				//because Firefox will send another request in this case and we will end up with 
				//two responses for the same requestId
				//example: the bookmarked download of firefox
				let contentRange = this.download.getHeader('content-range', 'response');
				if(contentRange){
					//it's okay if server is responsing with a range starting from zero, even if we 
					//have not requested a range
					if(contentRange.indexOf('bytes 0-') !== -1){
						this._isStatusOK = true;
					}
					//if server is sending a range which does not start from zero and we have
					//not requested a range then this is not ok
					else if(!this.download.getHeader('range', 'request')){
						this._isStatusOK = false;
					}
				}
				else{
					this._isStatusOK = true;
				}
			}
		}

		return this._isStatusOK;
	}

	isFromCache()
	{
		return this.download.httpDetails.fromCache;
	}

	isExcludedInOpts()
	{
		if(typeof this._isExcludedInOpts === 'undefined'){
			if(this._isInExtensionList(this.options.excludedExts)){
				this._isExcludedInOpts = true; 
			}
			else if(this._isInMimeList(this.options.excludedMimes)){
				this._isExcludedInOpts = true;
			}
			else{
				this._isExcludedInOpts = false;
			}
		}

		return this._isExcludedInOpts;
	}

	isIncludedInOpts()
	{
		if(typeof this._isIncludedInOpts === 'undefined'){
			if(this._isInExtensionList(this.options.includedExts)){
				this._isIncludedInOpts = true; 
			}
			else if(this._isInMimeList(this.options.includedMimes)){
				this._isIncludedInOpts = true;
			}
			else{
				this._isIncludedInOpts = false;
			}
		}

		return this._isIncludedInOpts;
	}

	isForcedInOpts()
	{
		if(typeof this._isForcedInOpts === 'undefined'){
			if(this._isInExtensionList(this.options.forcedExts)){
				this._isForcedInOpts = true; 
			}
			else if(this._isInMimeList(this.options.forcedMimes)){
				this._isForcedInOpts = true;
			}
			else{
				this._isForcedInOpts = false;
			}
		}

		return this._isForcedInOpts;
	}

	isBlackListed()
	{
		if(Options.opt.blacklistURLs.includes(this.download.url)){
			return true;
		}
		if(
			this.options.blacklistDomains.includes(this.download.host) ||
			this.options.blacklistDomains.includes(Utils.getDomain(this.download.origin))
		){
			return true;
		}
		return false;
	}

	isTypeWebRes()
	{
		if(typeof this._isTypWebRes === 'undefined'){
			this._isTypWebRes = this._isInTypeList(constants.webResTypes);
		}
		return this._isTypWebRes;
	}

	isTypeWebOther()
	{
		if(typeof this._isTypWebOther === 'undefined'){
			this._isTypWebOther = this._isInTypeList(constants.webOtherTypes);
		}
		return this._isTypWebOther;
	}

	isTypeMedia()
	{
		if(typeof this._isTypMedia === 'undefined'){
			this._isTypMedia = this._isInTypeList(constants.mediaTypes);
		}
		return this._isTypMedia;
	}

	isMimeWebRes()
	{
		return this._isInMimeList(constants.webResMimes);
	}
	isMimeWebOther()
	{
		return this._isInMimeList(constants.webOtherMimes);
	}
	isMimeMedia()
	{
		return this._isInMimeList(constants.mediaMimes);
	}
	isMimeStreamManifest()
	{
		return 	this._isInMimeList(constants.hlsMimes) || 
			this._isInMimeList(constants.dashMimes);
	}
	isMimeCompressed()
	{
		return this._isInMimeList(constants.compressedMimes);
	}
	isMimeDocument()
	{
		return this._isInMimeList(constants.documentMimes);
	}
	isMimeGeneralBinary()
	{
		return this._isInMimeList(constants.generalBinaryMimes);
	}

	isExtWebRes()
	{
		return this._isInExtensionList(constants.webResExts);
	}
	isExtWebOther()
	{
		return this._isInExtensionList(constants.webOtherExts);
	}
	isExtMedia()
	{
		return this._isInExtensionList(constants.mediaExts);
	}
	isExtStreamManifest()
	{
		return	this._isInExtensionList(constants.hlsExts) ||
			this._isInExtensionList(constants.dashExts);
	}
	isExtCompressed()
	{
		return this._isInExtensionList(constants.compressedExts);
	}
	isExtDocument()
	{
		return this._isInExtensionList(constants.documentExts);
	}
	isExtBinary()
	{
		return this._isInExtensionList(constants.binaryExts);
	}

	
}

interface RequestHandler
{
	download: Download;
	filter: ReqFilter;
	handle(): Promise<webx_BlockingResponse>;
}

/**
 * A fixed sized map with key->value pairs
 * When size gets bigger than the limit, first element is deleted 
 * and the new element is put in
 * Duplicate elements will rewrite the old ones
 */
// class FixedSizeMap<T, V>
// {
// 	maxSize = 100;
// 	map = new Map<T, V>();

// 	/**
// 	 * 
// 	 * @param maxSize max size of this map
// 	 * @param listData (optional) the data to initialize this FixedSizeMap with
// 	 */
// 	constructor(maxSize: number, listData?: Map<T, V>)
// 	{
// 		this.maxSize = maxSize;
// 		this.map = (listData) ? this._trimMap(listData, maxSize) : new Map<T, V>();
// 	}

// 	get keys()
// 	{
// 		return this.map.keys();
// 	}

// 	get values()
// 	{
// 		return this.map.values();
// 	}

// 	get size()
// 	{
// 		return this.map.size;
// 	}

// 	remove(key: T)
// 	{
// 		this.map.delete(key);
// 	}

// 	put(key: T, value: V)
// 	{
// 		if (this.size === this.maxSize)
// 		{
// 			let firstItemKey = this.map.keys().next().value;
// 			this.remove(firstItemKey);
// 		}

// 		this.map.set(key, value);
// 	}

// 	get(key: T): V
// 	{
// 		let dl = this.map.get(key);
// 		if(!dl)
// 		{
// 			log.err(`Item with key: ${key} was not found`);
// 		}

// 		return dl;
// 	}

// 	private _trimMap(newMap: Map<T,V>, targetSize: number)
// 	{
// 		let keys = newMap.keys();
// 		let size = newMap.size;
// 		if (targetSize < size)
// 		{
// 			let diff = size - targetSize;
// 			for (let i = 0; i < diff; i++){
// 				newMap.delete(keys.next().value);
// 			}
// 		}
// 		return newMap;
// 	}
	
// }

var constants = {

	dateForamt : { hour: 'numeric', minute:'numeric', month: 'short', day:'numeric' },

	webSocketProtos : ["ws://", "wss://"],
	webSocketTypes: ['websocket'],


	// These are things that are web resources such as images and css and we generally
	// do not want to grab them
	webResTypes: ['stylesheet', 'script', 'font', 'image', 'imageset'],
	webOtherTypes: [
		'xbl', 'xml_dtd', 'xslt', 'web_manifest', 
		'object', 'beacon', 'csp_report', 'object_subrequest', 'ping', 'speculative'
	],
	webResMimes: [
		'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/vnd.microsoft.icon', 
		'image/bmp', 'image/webp', 'image/tiff',
		'font/ttf', 'font/otf', 'application/vnd.ms-fontobject', 'font/woff', 'font/woff2', 
		'text/css', 'text/javascript', 'application/javascript',
	],
	webOtherMimes: [
		'text/html', 'application/xhtml+xml', 'application/json', 'application/ld+json', 
		'application/xml', 'text/xml', 'application/php', 
	],
	webResExts: [
		'jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'bmp', 'webp', 'tif', 'tiff',
		'ttf', 'otf', 'eot', 'woff2', 'woff',
		'css', 'js',
	],
	webOtherExts: [
		'html', 'htm', 'dhtml', 'xhtml', 'json', 'jsonld', 'xml', 'rss',
		'php', 'php3', 'php5', 'asp', 'aspx', 'jsp', 'jspx',
	],


	// Images
	imageExts: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'bmp', 'webp', 'tif', 'tiff'],
	imageMimes: [
		'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/vnd.microsoft.icon', 
		'image/bmp', 'image/webp', 'image/tiff',
	],
	imageTypes: ['image', 'imageset'],


	// Fonts
	fontExts: ['ttf', 'otf', 'eot', 'woff2', 'woff'],
	fontMimes: [
		'font/ttf', 'font/otf', 'application/vnd.ms-fontobject', 'font/woff', 'font/woff2', 
	],
	fontTypes: [
		'font'
	],

	// Texty things
	textualExts : [
		//static content
		'css', 'js', 'html', 'htm', 'dhtml', 'xhtml', 'json', 'jsonld', 'xml', 'rss',
		//dynamic pages
		'php', 'php3', 'php5', 'asp', 'aspx', 'jsp', 'jspx',
	],
	textualMimes : [
		//static content
		'text/css', 'text/javascript', 'application/javascript', 'text/html', 'application/xhtml+xml', 
		'application/json', 'application/ld+json', 'application/xml', 'text/xml',
		//dynamic pages
		'application/php', 
	],
	textualTypes: ['stylesheet', 'script', 'xbl', 'xml_dtd', 'xslt', 'web_manifest'],


	// These are types as defined by Mozilla associated with web requests
	otherWebTypes: ['object', 'beacon', 'csp_report', 'object_subrequest', 'ping', 'speculative'],


	// AJAX obviously
	ajaxTypes: ['xmlhttprequest'],


	// Compresses things
	compressedExts: [
		'zip', 'gzip', 'gz', 'bz', 'bz2', '7z', 'tar', 'tgz', 'rar', 'jar', 'xpi', 'apk',
	],
	compressedMimes: [
		'application/x-compressed', 'application/x-zip-compressed', 'application/zip', 
		'application/x-gzip', 'application/x-bzip', 'application/x-bzip2', 'application/x-7z',
		'application/x-tar', 'application/gnutar', 	'application/x-rar-compressed',
	],


	// Media things
	mediaExts: [
		//audio 
		'wav', 'wave', 'aiff', 'flac', 'alac', 'wma', 'mp3', 'ogg', 'aac', 'wma', 'weba',
		//video 
		'avi', 'flv', 'swf', 'wmv', 'mov', 'qt', 'ts', 'mp4', 'm4p', 'm4v', 'mkv', 'mpg', 'mpeg',
		'mp2', 'mpv', 'mpe', 'avchd', 'webm',
	],
	mediaMimes: [
		//audio
		'audio/wav', 'audio/aiff', 'audio/x-aiff', 'audio/flac', 'audio/mpeg', 'audio/mpeg3', 
		'audio/x-mpeg-3', 'audio/mp3', 'audio/ogg', 'audio/aac', 'audio/x-aac', 'audio/webm',
		//video
		'application/x-troff-msvideo', 'video/avi', 'video/msvideo', 'video/x-msvideo', 
		'application/x-shockwave-flash', 'video/quicktime', 'video/mp2t', 'video/mpeg', 
		'video/mp4', 'video/webm',
	],
	mediaTypes : [
		'media'
	],


	// Stream things
	hlsExts: [
		'm3u8',
	],
	hlsMimes: [
		'application/x-mpegURL', 'vnd.apple.mpegURL',
	],
	dashExts: [
		'mpd',
	],
	dashMimes: [
		'application/dash+xml', 'video/vnd.mpeg.dash.mpd',
	],


	// Document things
	documentExts : [
		//documents
		'doc', 'xls', 'ppt', 'docx', 'xlsx', 'pptx', 'pdf', 'epub', 'mobi', 'djvu', 'cbr',
	],
	documentMimes: [
		'application/msword', 'application/mspowerpoint', 'application/powerpoint', 
		'application/x-mspowerpoint','application/excel', 'application/x-excel', 'application/pdf',
	],


	// Binary things
	binaryExts: [
		//platform-specific
		'exe', 'msi', 'deb', 'rpm', 'pkg', 'dmg', 'app', 
		//other
		'bin', 'iso',
	],
	generalBinaryMimes : [
		//other
		'application/octet-stream', 'application/binary',
	],


	// Things that are displayable in the browser
	disPlayableExts: [
		'wav', 'wave', 'ogg', 'oga', 'ogv', 'ogx', 'spx', 'opus', 'webm', 'flac', 'mp3', 
		'mp4', 'm4a', 'm4p', 'm4b', 'm4r', 'm4v', 'txt', 'pdf'
	],
	disPlayableMimes: [
		'audio/wav', 'audio/ogg', 'video/ogg', 'audio/webm', 'video/webm', 'audio/flac', 
		'audio/mpeg', 'audio/mpeg3', 'audio/x-mpeg-3', 'audio/mp3', 'video/mp4', 
		'text/plain', 'application/pdf'
	],


	mimesToExts:
	{
		"audio/aac" : "aac",
		"audio/x-aac" : "aac",
		"application/x-abiword" : "abw",
		"application/x-freearc" : "arc",
		"video/x-msvideo" : "avi",
		"application/vnd.amazon.ebook" : "azw",
		"application/octet-stream" : "bin",
		"image/bmp" : "bmp",
		"application/x-bzip" : "bz",
		"application/x-bzip2" : "bz2",
		"application/x-csh" : "csh",
		"text/css" : "css",
		"text/csv" : "csv",
		"application/msword" : "doc",
		"application/mspowerpoint" : "pptx",
		"application/powerpoint" : "pptx",
		"application/x-mspowerpoint" : "pptx",
		"application/excel" : "xlsx",
		"application/x-excel" : "xlsx",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "xlsx",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "docx",
		"application/vnd.ms-fontobject" : "eot",
		"application/epub+zip" : "epub",
		"application/gzip" : "gz",
		"application/x-gzip" : "gz",
		"image/gif" : "gif",
		"text/html" : "html",
		"image/vnd.microsoft.icon" : "ico",
		"text/calendar" : "ics",
		"application/java-archive" : "jar",
		"image/jpeg" : "jpg",
		"text/javascript" : "js",
		"application/javascript" : "js",
		"application/json" : "json",
		"application/ld+json" : "jsonld",
		"audio/midi audio/x-midi" : "midi",
		"audio/mpeg" : "mp3",
		"audio/mpeg3" : "mp3",
		"audio/x-mpeg-3" : "mp3",
		"audio/mp3" : "mp3",
		"video/mpeg" : "mpeg",
		"video/mp4" : "mp4",
		"application/vnd.apple.installer+xml" : "mpkg",
		"application/vnd.oasis.opendocument.presentation" : "odp",
		"application/vnd.oasis.opendocument.spreadsheet" : "ods",
		"application/vnd.oasis.opendocument.text" : "odt",
		"audio/ogg" : "oga",
		"video/ogg" : "ogv",
		"application/ogg" : "ogx",
		"audio/opus" : "opus",
		"font/otf" : "otf",
		"image/png" : "png",
		"application/pdf" : "pdf",
		"application/php" : "php",
		"application/vnd.ms-powerpoint" : "ppt",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation" : "pptx",
		"application/vnd.rar" : "rar",
		"application/x-rar-compressed" : "rar",
		"application/rtf" : "rtf",
		"application/x-sh" : "sh",
		"image/svg+xml" : "svg",
		"application/x-shockwave-flash" : "swf",
		"video/quicktime" : "mov",
		"video/mp2t" : "ts",
		"application/x-tar" : "tar",
		"application/gnutar" : "tar",
		"image/tiff" : "tiff",
		"font/ttf" : "ttf",
		"text/plain" : "txt",
		"application/vnd.visio" : "vsd",
		"audio/wav" : "wav",
		"audio/aiff" : "aiff",
		"audio/x-aiff" : "aiff",
		"audio/webm" : "weba",
		"video/webm" : "webm",
		"application/x-troff-msvideo" : "avi",
		"video/avi" : "avi",
		"video/msvideo" : "avi",
		"image/webp" : "webp",
		"font/woff" : "woff",
		"font/woff2" : "woff2",
		"application/xhtml+xml" : "xhtml",
		"application/vnd.ms-excel" : "xls",
		"application/xml" : "xml",
		"text/xml" : "xml",
		"application/vnd.mozilla.xul+xml" : "xul",
		"application/zip" : "zip",
		"application/x-compressed" : "zip",
		"application/x-zip-compressed" : "zip",
		"video/3gpp" : "3gp",
		"audio/3gpp" : "3gp",
		"video/3gpp2" : "3g2",
		"audio/3gpp2" : "3g2",
		"application/x-7z" : "7z",
		"application/x-7z-compressed" : "7z"
	} as {[index:string]: string},


	extsToMimes: 
	{
		"aac" : ["audio/aac", "audio/x-aac"],
		"abw" : ["application/x-abiword"],
		"arc" : ["application/x-freearc"],
		"azw" : ["application/vnd.amazon.ebook"],
		"bin" : ["application/octet-stream"],
		"bmp" : ["image/bmp"],
		"bz" : ["application/x-bzip"],
		"bz2" : ["application/x-bzip2"],
		"csh" : ["application/x-csh"],
		"css" : ["text/css"],
		"csv" : ["text/csv"],
		"doc" : ["application/msword"],
		"ppt" : ["application/vnd.ms-powerpoint"],
		"pptx" : ["application/mspowerpoint", "application/powerpoint", "application/x-mspowerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
		"xlsx" : ["application/excel", "application/x-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
		"docx" : ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
		"eot" : ["application/vnd.ms-fontobject"],
		"epub" : ["application/epub+zip"],
		"gz" : ["application/gzip", "application/x-gzip"],
		"gif" : ["image/gif"],
		"html" : ["text/html"],
		"ico" : ["image/vnd.microsoft.icon"],
		"ics" : ["text/calendar"],
		"jar" : ["application/java-archive"],
		"jpg" : ["image/jpeg"],
		"js" : ["text/javascript", "application/javascript"],
		"json" : ["application/json"],
		"jsonld" : ["application/ld+json"],
		"midi" : ["audio/midi audio/x-midi"],
		"mjs" : ["text/javascript"],
		"mp3" : ["audio/mpeg", "audio/mpeg3", "audio/x-mpeg-3", "audio/mp3"],
		"mpeg" : ["video/mpeg"],
		"mp4" : ["video/mp4"],
		"mpkg" : ["application/vnd.apple.installer+xml"],
		"odp" : ["application/vnd.oasis.opendocument.presentation"],
		"ods" : ["application/vnd.oasis.opendocument.spreadsheet"],
		"odt" : ["application/vnd.oasis.opendocument.text"],
		"oga" : ["audio/ogg"],
		"ogv" : ["video/ogg"],
		"ogx" : ["application/ogg"],
		"opus" : ["audio/opus"],
		"otf" : ["font/otf"],
		"png" : ["image/png"],
		"pdf" : ["application/pdf"],
		"php" : ["application/php"],
		"rar" : ["application/vnd.rar", "application/x-rar-compressed"],
		"rtf" : ["application/rtf"],
		"sh" : ["application/x-sh"],
		"svg" : ["image/svg+xml"],
		"swf" : ["application/x-shockwave-flash"],
		"mov" : ["video/quicktime"],
		"ts" : ["video/mp2t"],
		"tar" : ["application/x-tar", "application/gnutar"],
		"tiff" : ["image/tiff"],
		"ttf" : ["font/ttf"],
		"txt" : ["text/plain"],
		"vsd" : ["application/vnd.visio"],
		"wav" : ["audio/wav"],
		"aiff" : ["audio/aiff",  "audio/x-aiff"],
		"weba" : ["audio/webm"],
		"webm" : ["video/webm"],
		"avi" : ["video/x-msvideo", "application/x-troff-msvideo", "video/avi", "video/msvideo"],
		"webp" : ["image/webp"],
		"woff" : ["font/woff"],
		"woff2" : ["font/woff2"],
		"xhtml" : ["application/xhtml+xml"],
		"xls" : ["application/vnd.ms-excel"],
		"xml" : ["application/xml", "text/xml"],
		"xul" : ["application/vnd.mozilla.xul+xml"],
		"zip" : ["application/zip", "application/x-compressed", "application/x-zip-compressed"],
		"3gp" : ["video/3gpp", "audio/3gpp"],
		"3g2" : ["video/3gpp2", "audio/3gpp2"],
		"7z" : ["application/x-7z", "application/x-7z-compressed"]
	} as {[index: string]: string[]},

}

/**
 * A data structure represending information needed by FlashGot.exe to perform a download
 * This information is needed for every single download if a list of links is provided
 */
type DownloadInfo = {
	url: string,
	desc: string,
	cookies: string,
	postData: string,
	filename: string,
	extension: string
}

/**
 * A data structure represending information needed by FlashGot.exe to perform a download
 * In case of a link list, the 'downloadsInfo' array holds the information for each link
 * And the rest of the arguments are general and apply to all links
 * This is based on how .fgt files are structured
 */
class DownloadJob
{	
	useragent: string = navigator.userAgent;

	constructor(public downloadsInfo: DownloadInfo[], public referer: string, 
		public originPageReferer: string, public originPageCookies: string, 
		public dmName:string)
	{
		//nada
	}

	/**
	 * Creates a job from a Download object
	 * @param dmName 
	 * @param download 
	 * @returns A DownloadJob object created from provided data
	 */
	static async getFromDownload(dmName: string, download: Download)
	{
		let originPageCookies = '';
		let originPageReferer = '';

		originPageCookies = await Utils.getCookies(download.origin);
		let tabs = await browser.tabs.query({url: download.origin});
		if(tabs[0]){
			let originTabId = tabs[0].id;
			originPageReferer = await Utils.executeScript(originTabId, {code: 'document.referrer'});
		}

		let downloadInfo: DownloadInfo = {
			url: download.url,
			filename: download.filename,
			cookies: download.getHeader('cookie', 'request') || '',
			postData: download.httpDetails.postData,
			desc: download.filename,
			extension: download.fileExtension
		};

		return new DownloadJob(
			[downloadInfo],
			download.getHeader('referer', 'request') || '',
			originPageReferer,
			originPageCookies,
			dmName
		);

	}

	/**
	 * Creates a job from link information
	 * This is used in context-menu scripts where we don't have any Download object
	 * and only have access to raw links
	 * @param dmName 
	 * @param links 
	 * @param originPageUrl 
	 * @param originPageReferer 
	 * @returns A DownloadJob object created from provided data
	 */
	static async getFromContext(dmName: string, result: ContextMenu.result)
	{
		let originPageUrl = result.originPageUrl;
		let originPageReferer = result.originPageReferer;
		let downloadsInfo: DownloadInfo[] = [];
		let originPageCookies = (originPageUrl)? await Utils.getCookies(originPageUrl) : '';
		//get the cookies for each link and add it to all download items
		for(let link of result.links)
		{
			if(!link.href){
				continue
			}
			let href = link.href;
			let desc = link.desc;
			let linkCookies = await Utils.getCookies(href);
			let filename = Utils.getFileName(href);
			let extension = Utils.getExtFromFileName(filename);
			let downloadInfo: DownloadInfo = {
				url: href,
				desc: desc,
				cookies: linkCookies,
				postData: '',
				filename: filename,
				extension: extension,
			}
			downloadsInfo.push(downloadInfo);
		}

		return new DownloadJob(
			downloadsInfo, originPageUrl, originPageReferer, originPageCookies, dmName);

	}

}

class YTDLJob
{
	/**
	 * 
	 * @param url URL to download
	 * @param type either 'audio' or 'video'
	 * @param filename name of the file to save
	 * @param dlHash hash of Download object related to this job
	 */
	constructor(public url: string, public type: string, 
		public filename: string, public dlHash: string)
	{
		this.url = encodeURI(url);
	}

	/**
	 * Gets a YTDLJob from a download
	 * @param download 
	 * @param formatId 
	 * @param type either 'audio' or 'video'
	 */
	static getFromDownload(download: Download, formatId: number, type: string): YTDLJob
	{
		if(!download.manifest)
		{
			log.err('Download is not a stream');
		}

		for(let format of download.manifest.playlists)
		{
			if(format.id == formatId)
			{
				return new YTDLJob(format.url, type, download.manifest.title, download.hash);
			}
		}

		log.err('Format with id ' + formatId + ' not found');
	}
}

class StreamManifest
{
	constructor(public url: string, public title: string, 
		public streamFormat: string, public fullManifest: any)
	{
		this.url = url;
		this.title = title;
		this.streamFormat = streamFormat;
		this.fullManifest = fullManifest;
	}

	getType()
	{
		if(this.fullManifest.playlists && this.fullManifest.playlists.length > 0)
		{
			return 'main';
		}
		else if(this.fullManifest.segments && this.fullManifest.segments.length > 0)
		{
			return 'playlist';
		}
		else
		{
			return undefined;
		}
	}

}

class MainManifest
{
	/**
	 * 
	 * @param fullManifest 
	 * @param playlists 
	 */
	constructor(public fullManifest: StreamManifest, public playlists: Playlist[], 
		public title: string)
	{
		//nada
	}

	/**
	 * 	Gets a new instance from a StreamManifest object	
	 * @param manifest 
	 * @returns 
	 */
	static getFromBase(manifest: StreamManifest)
	{
		let playlists = [];

		let id = 0;
		for(let playlist of manifest.fullManifest.playlists)
		{
			let p = Playlist.getFromRawPlaylist(playlist, manifest.url, id);
			playlists.push(p);
			id++;
		}

		return new MainManifest(manifest.fullManifest, playlists, manifest.title);
	}
}

class PlaylistManifest
{
	constructor(public duration: number, public fullManifest: any, public title: string)
	{
		//nada
	}

	/**
	 * 
	 * @param manifest 
	 * @returns 	 
	*/
	static getFromBase(manifest: StreamManifest): PlaylistManifest
	{
		let duration = 0;
		for(let seg of manifest.fullManifest.segments)
		{
			duration += seg.duration;
		}
		return new PlaylistManifest(duration, manifest.fullManifest, manifest.title);
	}
}

class Playlist
{
	constructor(public id: number, public nickName: string, public url: string, 
		public res: string, public bitrate: number, public pictureSize: number, 
		public fileSize = -1, public duration = -1)
	{
		//nada
	}

	/**
	 * Updates duration and filesize data
	 * @param manifest
	 */
	update(manifest: PlaylistManifest)
	{
		if(manifest.duration)
		{
			this.duration = manifest.duration;
			this.fileSize = manifest.duration * this.bitrate / 8;
		}
	}

	static getFromRawPlaylist(playlist: any, manifestURL: string, id: number)
	{
		let bitrate = 0;
		if(playlist.attributes.BANDWIDTH){
			bitrate = playlist.attributes.BANDWIDTH;
		}
		let w = 0;
		let h = 0;
		if(playlist.attributes.RESOLUTION)
		{
			w = playlist.attributes.RESOLUTION.width || 0;
			h = playlist.attributes.RESOLUTION.height || 0;
		}
		let pictureSize = w * h;
		let res = (w && h)? w.toString() + 'x' + h.toString() : 'unknown';
		let name = (playlist.attributes.NAME)? playlist.attributes.NAME : ((h)? h + 'p' : 'Format-#' + (id + 1));
		//if the links to the sub-manifests(playlists) are not absolute paths then there might
		//be issues later because we are in the addon context and not the web page context
		//so for example a playlist with the link 'playlist-720p.hls' should become https://videosite.com/playlist-720p.hls
		//but instead it becomes moz-extension://6286c73d-d783-40a8-8a2c-14571704f45d/playlist-720p.hls
		//the issue was resolved after using fetch() instead of XMLHttpRequest() but I kept this just to be safe
		let url = (new URL(playlist.uri, manifestURL)).toString();
		return new Playlist(id, name, url, res, bitrate, pictureSize);
	}
}