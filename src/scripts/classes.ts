type GRBJSON =
{
	allDownloads: [key: string, value: object][];
	tabs: [key: number, value: any][];
	options: Options.GRBOptions;
	availableDMs: string[];
}

/**
 * Class for the popup GRB instance (GRBPopup)
 */
class GrabbyPopup
{
	allDownloads: Map<string, Download>;
	tabs: SureMap<number, tabinfo>;
	options: Options.GRBOptions;
	availableDMs: string[];

	constructor(grbJSON: GRBJSON)
	{
		this.tabs = new SureMap(grbJSON.tabs);
		this.availableDMs = grbJSON.availableDMs;
		this.options = grbJSON.options;
		this.allDownloads = this.recreateDownloads(grbJSON.allDownloads);
	}

	private recreateDownloads(allDownloads: [key: string, value: object][]): Map<string, Download>
	{
		let newDownloads = new Map<string, Download>();

		for(let pair of allDownloads)
		{
			let hash = pair[0];
			let downloadJSON = pair[1] as Download;
			let download = new Download(downloadJSON.httpDetails, this.tabs);
			//copy all JSON-like properties from downloadJSON to the new download object
			//@ts-ignore
			delete downloadJSON._tabs;
			Object.assign(download, downloadJSON);
			newDownloads.set(hash, download);
		};

		return newDownloads;
	}
}

/**
 * Class for the main grabby instance
 */
class Grabby
{
	allRequests = new Map<string, HTTPDetails>();
	allDownloads = new Map<string, Download>();
	tabs = new SureMap<number, tabinfo>();
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

	doDownloadJob(job: DownloadJob)
	{
		log.d("doing job", job);
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
}

interface GRBWindow
{
	display(): Promise<webx_window>;
}

class DownloadWindow implements GRBWindow
{
	download: Download;

	constructor(download: Download)
	{
		this.download = download;
	}

	/**
	 * Displays the download override window
	 * we put the download hash into the URL of the window
	 * when the window is created we retreive this hash and get the corresponding download from GRBPop
	 * when the dialog is closed it sends a message to the background script telling it whether to continue or block the request
	 */
	display()
	{
		let screenW = window.screen.width;
		let screenH = window.screen.height;
		let windowW = 480;
		let windowH = 350;
		let leftMargin = (screenW/2) - (windowW/2);
		let topMargin = (screenH/2) - (windowH/2);

		let createData = 
		{
			type: "detached_panel",
			titlePreface: this.download.filename,
			//add the hash of the download to the URL of this window
			//when the window is loaded our code will use the hash to get the download from GRBPop
			//todo: make this like popup like a class
			url: "views/download_window/download.html?dlHash=" + this.download.hash,
			allowScriptsToClose : true,
			width: windowW,
			height: windowH,
			left: leftMargin,
			top: topMargin
		};

		return browser.windows.create(createData);
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
	tabId: number | undefined;
	initiatorUrl: string | undefined;
	httpDetails: HTTPDetails;

	//these are set later
	isStream = false;
	hidden = false;
	streamData: StreamData | undefined = undefined;
	specialType: typeof SpecialSiteHandler.specialTypes[number] | undefined = undefined;
	cat = '';
	class = '';
	classReason = 'no-class-yet';
	//a Promise.resolve object is stored here for downloads that we intercept from the browser
	//calling resolve() on this download will continue the request
	resolveRequest: ((value: webx_BlockingResponse) => void) | undefined = undefined;

	private _hash = '';
	private _filename: str_und = undefined;
	private _host: str_und = undefined;
	private _filesize: num_und = -1;
	private _fileExtension: str_und = undefined;
	private _ownerTabId: num_und = undefined;
	private _ownerTabUrl: str_und = undefined;
	private _isFromBlankTab: bool_und = undefined;
	private _tabs: SureMap<number, tabinfo>;

	/**
	 * Creates a new Download object
	 */
	constructor(details: HTTPDetails, tabs: SureMap<number, tabinfo>)
	{
		this.requestId = details.requestId;
		this.url = details.url;
		this.statusCode = details.statusCode;
		this.time = details.timeStamp;
		this.resourceType = details.type;
		this.tabId = (details.tabId > 0)? details.tabId : undefined;
		this.initiatorUrl = (details.originUrl)? details.originUrl : details.documentUrl;
		this.httpDetails = details;
		this._tabs = tabs;
	}

	get ownerTabId(): number
	{
		if(typeof this._ownerTabId === 'undefined')
		{
			//todo: handle this case
			//if this is a download not associated with any tabs like service workers (reddit.com)
			if(typeof this.tabId === 'undefined'){
				log.err('download does not have a tab id', this);
			}

			if(this.isFromBlankTab)
			{
				let tab = this._tabs.getsure(this.tabId);

				if(typeof tab.openerId === 'undefined')
				{
					//this happens when we open a blank tab directly
					//for example a bookmark to here: https://www.st.com/resource/en/datasheet/lm317.pdf
					log.warn('blank tab does not have an opener id', tab);
					this._ownerTabId = this.tabId;
				}
				else
				{
					this._ownerTabId = tab.openerId;
				}
			}
			else
			{
				this._ownerTabId = this.tabId;
			}
		}

		return this._ownerTabId;
	}

	get ownerTabUrl(): string
	{
		if(typeof this._ownerTabUrl === 'undefined')
		{
			let tab = this._tabs.getsure(this.ownerTabId);
			this._ownerTabUrl = tab.url;
		}

		return this._ownerTabUrl;
	}

	get isFromBlankTab(): boolean
	{
		if(typeof this._isFromBlankTab === 'undefined')
		{
			//blank tabs have a tab id
			if(typeof this.tabId === 'undefined'){
				this._isFromBlankTab = false;
				return this._isFromBlankTab;
			}
	
			let tab = this._tabs.getsure(this.tabId);
			this._isFromBlankTab = (tab.url === 'about:blank');
		}

		return this._isFromBlankTab;
	}

	get tabTitle(): string | undefined
	{
		if(typeof this.tabId === 'undefined')
		{
			return undefined;
		}
		
		let tab = this._tabs.getsure(this.tabId);
		return tab.title;
	}

	get hash()
	{
		if(this._hash === ''){
			this._hash = md5(this.url);
		}
		return this._hash;
	}

	/**
	 * get file name (if available) of the resouce requested
	 * @returns file name or "unknown" if now available
	 */
	get filename(): string
	{
		if(typeof this.streamData != 'undefined')
		{
			return this.streamData.title;
		}

		if(typeof this._filename === "undefined")
		{
			this._filename = "unknown";

			let disposition = this.getHeader('content-disposition', 'response');
			if(disposition)
			{
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
			if(this._filename === "unknown")
			{
				let filename = Utils.getFileName(this.url);
				if(filename){
					this._filename = filename;
				}
			}
			//if the url has no file extension give it a serial number
			//useful for urls like 'media.tenor.com/videos/9dd6603af0ac712c6a38dde9255746cd/mp4'
			//where lots of resources have the same path and hence the same filename
			if(this._filename !== "unknown" && this._filename.indexOf(".") === -1)
			{
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
	get size(): number | undefined
	{
		//-1 means uninitialized
		if(this._filesize === -1){

			this._filesize = undefined; 

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

	get requestBody(): webx_requestBody | undefined
	{
		return this.httpDetails.requestBody;
	}

	//todo: test this
	getPostData(): string | undefined
	{
		if(!this.requestBody){
			return undefined;
		}

		if(!this.requestBody.formData){
			return undefined;
		}
		
		let postData = '';
		for(let key in this.requestBody.formData)
		{
			let values = this.requestBody.formData[key];
			for(let value of values)
			{
				postData = postData + `${key}=${value}&`;
			}
		}

		//remove last '&'
		postData = postData.slice(0, -1);

		return postData;
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

}

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
	private _specialHandler: typeof SpecialSiteHandler.specialHandlers[number] | '' | undefined = undefined;
	private _isAddonRequest: bool_und = undefined;

	/* constructor */

	constructor(public download: Download, public options: Options.GRBOptions){}

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
		let size = this.download.size;
		if(typeof size === 'undefined') return false;
		let sizeLimit = this.options.grabFilesLargerThanMB * 1000000;
		return size < sizeLimit;
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

		if(this.options.blacklistDomains.includes(this.download.host)){
			return true;
		}

		if(this.download.initiatorUrl){
			if(this.options.blacklistDomains.includes(
				Utils.getDomain(this.download.initiatorUrl))){
				return true;
			}
		}

		return false;
	}

	getSpecialHandler()
	{
		if(typeof this._specialHandler === 'undefined')
		{
			if(this.isAddonRequest())
			{
				this._specialHandler = '';
			}
			else
			{
				let domain = Utils.getDomain(this.download.url);
				this._specialHandler = (typeof SpecialSiteHandler.specialDomains[domain] != 'undefined')?
					SpecialSiteHandler.specialDomains[domain] : '';
			}
		}

		return this._specialHandler;
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

	isAddonRequest()
	{
		if(typeof this._isAddonRequest === 'undefined')
		{
			this._isAddonRequest = false;

			let originUrl = this.download.httpDetails.originUrl;
			if(typeof originUrl != 'undefined' && originUrl.startsWith('moz-extension')){
				this._isAddonRequest = true;
			}
		}

		return this._isAddonRequest;
	}

	
}

interface RequestHandler
{
	handle(): Promise<webx_BlockingResponse>;
}

interface SpecialHandler
{
	handle(): void;
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
	{}

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

		if(download.initiatorUrl)
		{
			originPageCookies = await Utils.getCookies(download.initiatorUrl);
		}
		
		if(download.ownerTabId)
		{
			try{
				originPageReferer = await Utils.executeScript(
					download.ownerTabId, 
					{code: 'document.referrer'}
				);
			}
			//the tab is closed so we can't get its referer
			catch(e){}
		}

		let downloadInfo: DownloadInfo = 
		{
			url: download.url,
			filename: download.filename,
			cookies: download.getHeader('cookie', 'request') || '',
			postData: download.getPostData() || '',
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

class FormatData 
{
	id: string;
	width: number;
	height: number;
	filesize: number;

	constructor(id: string, width: number, height: number, fileSize: number)
	{
		this.id = id;
		this.width = width;
		this.height = height;
		this.filesize = fileSize;
	}

	get pictureSize(): number
	{
		return this.width * this.height;
	}

	static getFromYTDLFormat(format: ytdl_format)
	{
		let id = format.format_id;
		let filesize = 0;

		if(format.filesize)
		{
			filesize = format.filesize;
		}
		else if(format.filesize_approx)
		{
			filesize = format.filesize_approx;
		}

		let width = (format.width)? format.width : 0;
		let height = (format.height)? format.height : 0;

		return new FormatData(id, width, height, filesize);
	}
}

class StreamData
{
	title: string;
	duration: number;
	formats: FormatData[];

	constructor(title: string, duration: number, formats: FormatData[])
	{
		this.title = title;
		this.duration = duration;
		this.formats = formats;
	}

	static getFromYTDLYoutube(info: ytdlinfo)
	{
		let formats: FormatData[] = [];

		for(let format of info.formats)
		{
			if(typeof format.format_note != 'string') continue; 
			if(!constants.ytStandardFormats.includes(format.format_note)) continue;
			if(!format.vcodec.startsWith('avc')) continue;
			if(typeof format.container != 'undefined' && format.container === 'mp4_dash')
			{
				formats.push(FormatData.getFromYTDLFormat(format));
			}
		}

		return new StreamData(info.title, info.duration, formats);
	}

	static getFromYTDLGeneral(info: ytdlinfo, download: Download)
	{
		let formats: FormatData[] = [];

		for(let format of info.formats)
		{
			if(format.protocol === 'https') continue;
			formats.push(FormatData.getFromYTDLFormat(format));
		}

		let title = info.title;

		if(typeof title === 'undefined' || !title)
		{
			title = (download.tabTitle)? download.tabTitle : 'Unknown Title';
			if(title != 'Unknown Title')
			{
				let domain = Utils.getDomain(download.ownerTabUrl);
				title = Utils.removeSitenameFromTitle(title, domain);
			}
		}

		let x = new StreamData(title, info.duration, formats);
		log.d('stream data be', x);
		return x;
	}
}

class FormatDataUI
{
	formatData: FormatData;

	constructor(data: FormatData)
	{
		this.formatData = data;
	}

	get id(): string
	{
		return this.formatData.id.toString();
	}

	get name(): string
	{
		if(this.formatData.height) return this.formatData.height.toString() + 'p';
		return 'Format #' + (this.formatData.id + 1).toString();
	}

	get resString(): string
	{
		if(this.formatData.width && this.formatData.height){
			return this.formatData.width.toString() + 'x' + this.formatData.height.toString();
		}
		else{
			return 'unknown';
		}
	}

	get fileSizeString(): string
	{
		let size = this.formatData.filesize;
		return (size > 0)? filesize(size, {round: 0}) : 'unknown';
	}
}

class StreamDataUI
{
	streamData: StreamData;
	formats: FormatDataUI[] = [];

	constructor(data: StreamData)
	{
		this.streamData = data;

		//sort
		data.formats.sort((a, b) => {return a.pictureSize - b.pictureSize;});

		for(let format of data.formats)
		{
			this.formats.push(new FormatDataUI(format));
		}
	}

	get title(): string
	{
		return this.streamData.title;
	}

	get duration(): string
	{
		return (this.streamData.duration > 0)? 
			Utils.formatSeconds(this.streamData.duration) : 'unkown duration';
	}

}

class tabinfo
{
	id: number;
	url: string;
	title: string;
	openerId: number | undefined;
	hasMainManifest = false;
	closed: boolean = false;

	constructor(tab: webx_tab)
	{
		this.id = tab.id;
		this.url = tab.url;
		this.title = tab.title;
		this.openerId = tab.openerTabId;
	}

	update(tab: webx_tab)
	{
		this.id = tab.id;
		this.url = tab.url;
		this.title = tab.title;
		this.openerId = tab.openerTabId;
	}
}

class SureMap<K, V> extends Map<K, V>
{
	getsure(key: K) : V
	{
		let item = this.get(key);
		
		if(typeof item === 'undefined')
		{
			log.err(`item with key of ${key} is not present in this map`, this);
		}

		return item;
	}
}