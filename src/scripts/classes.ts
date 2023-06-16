type GBJSON =
{
	allDownloads: [key: string, value: object][];
	tabs: [key: number, value: any][];
	options: Options.GBOptions;
	browser: browser_info;
}

/**
 * Class for the popup GB instance (GBPop)
 */
class GrabbyPopup
{
	allDownloads = new Map<string, GrabbedDownload>();
	tabs: SureMap<number, tabinfo>;
	options: Options.GBOptions;
	browser: browser_info;

	constructor(gbJSON: GBJSON)
	{
		this.tabs = new SureMap(gbJSON.tabs);
		this.options = gbJSON.options;
		this.browser = gbJSON.browser;
		this.recreateDownloads(gbJSON.allDownloads);
	}

	private recreateDownloads(allDownloads: [key: string, value: object][])
	{
		for(let pair of allDownloads)
		{
			let hash = pair[0];
			let dlJSON = pair[1] as GrabbedDownload;
			this.addToAllDownloads(dlJSON, hash);
		};
	}

	private addToAllDownloads(dlJSON: GrabbedDownload, hash: string)
	{
		let dl: GrabbedDownload;

		switch(dlJSON.type)
		{
			case 'Audio':
				dl = new AudioDownload(dlJSON.httpDetails, this.tabs);
				break;

			case 'Binary':
				dl = new BinaryDownload(dlJSON.httpDetails, this.tabs);
				break;

			case 'Compressed Archive':
				dl = new CompressedDownload(dlJSON.httpDetails, this.tabs);
				break;
			
			case 'Document':
				dl = new DocumentDownload(dlJSON.httpDetails, this.tabs);
				break;

			case 'Image':
				dl = new ImageDownload(dlJSON.httpDetails, this.tabs);
				break;

			case 'Text':
				dl = new TextDownload(dlJSON.httpDetails, this.tabs);
				break;

			case 'Video File':
				dl = new VideoDownload(dlJSON.httpDetails, this.tabs);
				break;

			case 'Other':
				dl = new OtherFileDownload(dlJSON.httpDetails, this.tabs);
				break;

			case 'Video Stream':
				dl = new StreamDownload(dlJSON.httpDetails, this.tabs);
				break;

			case 'YouTube Video':
				dl = new YoutubeDownload((dlJSON as YoutubeDownload).videoId, 
					dlJSON.httpDetails, this.tabs);
				break;

			case 'YouTube Playlist':
				dl = new YTPlaylistDownload((dlJSON as YTPlaylistDownload).listId, 
					dlJSON.httpDetails, this.tabs);
				break;

			case 'Reddit Video':
				dl = new RedditDownload(dlJSON.httpDetails, this.tabs);
				break;
		}

		//@ts-ignore
		delete dlJSON._tabs;

		//copy all JSON-like properties from downloadJSON to the new download object
		Object.assign(dl, dlJSON);
		this.allDownloads.set(hash, dl);
	}
}

/**
 * Class for the main grabby instance
 */
class Grabby
{
	allRequests = new Map<string, HTTPDetails>();
	allDownloads = new Map<string, GrabbedDownload>();
	tabs = new SureMap<number, tabinfo>();
	//@ts-ignore
	browser: browser_info;

	addToAllDownloads(download: GrabbedDownload)
	{
		log.d('adding to all downloads: ', download);

		let duplicate = this.allDownloads.get(download.hash);

		if(typeof duplicate === 'undefined')
		{
			this.allDownloads.set(download.hash, download);
			return;
		}

		log.warn('download is duplicate of', duplicate);

		if(!download.tabId)
		{
			download.tabId = download.ownerTabId;
		}

		if(!duplicate.tabId)
		{
			duplicate.tabId = duplicate.ownerTabId;
		}

		//if the duplicate is from the same tab as the previous download do not add it
		if(duplicate.tabId === download.tabId)
		{
			log.d('ignoring because same tab id');
			return;
		}

		//todo: handle this
		if(!download.tabId)
		{
			//if we are here we do not have a tab ID nor a ownertabid so it will be shown
			//on every tab so no need to add it again
			log.warn('duplicate download does not have a tab id', download);
			return;
		}

		//if there is a duplicate but it's from another tab then add a salt to it
		//make its hash unique again, and then add it to all downloads
		download.setSalt(download.tabId.toString());
		
		this.allDownloads.set(download.hash, download);

		log.d('added duplicate download with salted hash', download);
	}

	doDownloadJob(job: DownloadJob)
	{
		log.d("doing job", job);

		if(job.dmName === CommandLineDM.DMNAME)
		{
			let dm = new CommandLineDM();
			dm.download(job);
		}
		else if(Options.opt.availBrowserDMs.includes(job.dmName))
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

interface GBWindow
{
	display(): Promise<webx_window>;
}

class DownloadWindow implements GBWindow
{
	download: GrabbedDownload;

	constructor(download: GrabbedDownload)
	{
		this.download = download;
	}

	/**
	 * Displays the download override window
	 * we put the download hash into the URL of the window
	 * when the window is created we retreive this hash and get the corresponding download from GBPop
	 * when the dialog is closed it sends a message to the background script telling it whether to continue or block the request
	 */
	display()
	{
		let screenW = window.screen.width;
		let screenH = window.screen.height;
		let windowW = 480;
		let windowH = 320;
		let leftMargin = Math.floor( (screenW/2) - (windowW/2) );
		let topMargin = Math.floor( (screenH/2) - (windowH/2) );

		let createData = 
		{
			type: "detached_panel",
			titlePreface: this.download.filename,
			//add the hash of the download to the URL of this window
			//when the window is loaded our code will use the hash to get the download from GBPop
			url: "/views/download_window/download.html?dlHash=" + this.download.hash,
			allowScriptsToClose : true,
			width: windowW,
			height: windowH,
			left: leftMargin,
			top: topMargin
		};

		return browser.windows.create(createData);
	}
}

class ListWindow implements GBWindow
{
	listType: list_window_type;
	tabId: number | undefined = undefined;
	dlHash: string | undefined = undefined;

	constructor(listType: list_window_type, data: number | string)
	{
		this.listType = listType;
		if(typeof data === 'number'){
			this.tabId = data;
		}
		else if(typeof data === 'string')
		{
			this.dlHash = data;
		}
	}

	display()
	{
		let screenW = window.screen.width;
		let screenH = window.screen.height;
		let windowW = Math.floor(screenW/2);
		let windowH = Math.floor(screenH * 0.7);
		let leftMargin = Math.floor( (screenW/2) - (windowW/2) );
		let topMargin = Math.floor( (screenH/2) - (windowH/2) );

		let url = `/views/list_window/list.html?listType=${this.listType}`;
		if(this.tabId)
		{
			url += `&tabId=${this.tabId}`;
		}
		if(this.dlHash)
		{
			url += `&dlHash=${this.dlHash}`;
		}

		let createData = 
		{
			type: "detached_panel",
			titlePreface: 'Filter and select downloads',
			url: url,
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
 * Class representing a basic unknown download
 * The type of this download is not known
 * Basically any web request is a download before it's passed into a handler
 */
class BaseDownload
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
	hidden = false;
	progress: dl_progress | undefined = undefined;
	cat = '';
	class = '';
	classReason = 'no-class-yet';

	protected _hash_src: string;
	private _hash = '';
	private _salt = '';
	private _filename: str_und = undefined;
	private _host: str_und = undefined;
	private _filesize: num_und = -1;
	private _fileExtension: str_und = undefined;
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
		this._hash_src = details.url;
	}

	get ownerTabId(): number | undefined
	{
		//todo: what do?
		if(typeof this.tabId === 'undefined')
		{
			for(let [tabId, tabInfo] of this._tabs.entries())
			{
				if(this.url === tabInfo.url)
				{
					return tabId;
				}
				log.d(this.url, ' [does not equal] ', tabInfo.url);
			}

			for(let [tabId, tabInfo] of this._tabs.entries())
			{
				if(this.httpDetails.documentUrl === tabInfo.url)
				{
					return tabId;
				}
			}

			for(let [tabId, tabInfo] of this._tabs.entries())
			{
				if(this.httpDetails.originUrl === tabInfo.url)
				{
					return tabId;
				}
			}
	
			log.warn('could not find owner tab for download', this);
			return undefined;
		}
		else if(this.isFromBlankTab)
		{
			let tab = this._tabs.getsure(this.tabId);

			if(typeof tab.openerId === 'undefined')
			{
				//this happens when we open a blank tab directly
				//for example a bookmark to here: https://www.st.com/resource/en/datasheet/lm317.pdf
				log.warn('blank tab does not have an opener id', tab);
				return this.tabId;
			}
			else
			{
				return tab.openerId;
			}
		}
		else
		{
			return this.tabId;
		}
	}

	get ownerTabUrl(): string | undefined
	{
		if(typeof this.ownerTabId == 'undefined') return undefined;
		return this._tabs.getsure(this.ownerTabId).url;
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
			this._isFromBlankTab = (tab.url === 'about:blank') || (tab.url === '');
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
			this._hash = md5(this._hash_src + this._salt);
		}
		return this._hash;
	}

	/**
	 * get file name (if available) of the resouce requested
	 * @returns file name or "unknown" if now available
	 */
	get filename(): string
	{
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

	updateProgress(prog: progress_data)
	{
		let status: dl_progress_status;

		if(!this.progress)
		{
			status = 'Downloading';
		}
		else if(prog.percent === 100)
		{
			status = 'Complete';
		}
		else if(this.progress.percent > prog.percent)
		{
			status = 'Converting';
		}
		else
		{
			status = this.progress.status;
		}

		this.progress = {percent: prog.percent, speed: prog.speed, status: status};
	}

	setSalt(salt: string)
	{
		this._hash = '';
		this._salt = salt;
	}

}

abstract class GrabbedDownload extends BaseDownload
{
	abstract type: download_type;
	abstract get iconURL(): string;
	
	get iconSize(): number
	{
		return 32;
	}
}

/**
 * This is the kind of download that returns a blocking webrequest and pauses the request
 * Used for showing the download window to the user
 */
interface ResolvableDownload
{
	//a Promise.resolve object is stored here for downloads that we intercept from the browser
	//calling resolve() on this download will continue the request
	resolveRequest: ((value: webx_BlockingResponse) => void) | undefined;
}

function isResolvable(obj: any): obj is ResolvableDownload
{
	return typeof obj.resolveRequest != 'undefined';
}

abstract class FileDownload extends GrabbedDownload implements ResolvableDownload
{
	resolveRequest: ((value: webx_BlockingResponse) => void) | undefined = undefined;
}

function isFileDownload(obj: any): obj is FileDownload
{
	return constants.fileTypes.includes(obj.type);
}

class AudioDownload extends FileDownload
{
	type: download_type = 'Audio';

	get iconURL()
	{
		return constants.iconsUrl + 'audio.png';
	}
}

class BinaryDownload extends FileDownload
{
	type: download_type = 'Binary';
	
	get iconURL()
	{
		return constants.iconsUrl + 'binary.png';
	}
}

class CompressedDownload extends FileDownload
{
	type: download_type = 'Compressed Archive';
	
	get iconURL()
	{
		return constants.iconsUrl + 'compressed.png';
	}
}

class DocumentDownload extends FileDownload
{
	type: download_type = 'Document';
	
	get iconURL()
	{
		return constants.iconsUrl + 'document.png';
	}
}

class ImageDownload extends FileDownload
{
	type: download_type = 'Image';
	
	get iconURL()
	{
		return constants.iconsUrl + 'image.png';
	}
	//todo: icon
}

class VideoDownload extends FileDownload
{
	type: download_type = 'Video File';
	thumbData: string = '';
	
	get iconURL()
	{
		return constants.iconsUrl + 'video.png';
	}

	get iconSize()
	{
		return (this.thumbData)? 64 : 32;
	}

	getThumbnail(): Promise<string>
	{
		return new Promise((resolve, reject) => 
		{
			let canvas = document.createElement("canvas");
			let video = document.createElement("video");
	
			video.preload = "metadata";
			video.controls = false;
			video.src = this.url;
	
			//webp @256px @0.5 is the best combination i found
			//here are the results from https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4
			/*
			64 png			9kb
			64 webp			2kb
			128 png			34kb
			128 webp		7kb
			128 webp@1.0	10kb
			256 webp@0.5	9kb
			1280 png		1950kb
			*/

			video.addEventListener('loadeddata', () => 
			{
				let ratio = 256 / video.videoWidth;
				let canvW = video.videoWidth * ratio;
				let canvH = video.videoHeight * ratio;

				canvas.width = canvW;
				canvas.height = canvH;
	
				canvas.getContext("2d")!.drawImage(video, 0, 0, canvW, canvH);
	
				let src = canvas.toDataURL('image/webp', 0.5);
	
				//remove video from DOM
				video.remove();

				if(src)
				{
					this.thumbData = src;
				}
				else
				{
					log.warn('could not get video thumbnail for', this);
					this.thumbData = this.iconURL;
				}

				resolve(this.thumbData);

			}, false);
	
			video.load();
		});
	}
}

function isVideoDownload(obj: any): obj is VideoDownload
{
	return (obj.type as download_type) === 'Video File';
}

class TextDownload extends FileDownload
{
	type: download_type = 'Text';
	
	get iconURL()
	{
		return constants.iconsUrl + 'textual.png';
	}
}

class OtherFileDownload extends FileDownload
{
	type: download_type = 'Other';
	
	get iconURL()
	{
		return constants.iconsUrl + 'other.png';
	}
}

interface YTDLableDownload<T, V>
{
	updateData(info: T): void;
	copyData(download: V): void;
}

class StreamDownload extends GrabbedDownload implements YTDLableDownload<ytdlinfo, StreamDownload>
{
	type: download_type = 'Video Stream';
	streamData: StreamData | undefined = undefined;
	
	get filename(): string
	{
		return (typeof this.streamData != 'undefined')? this.streamData.title : 'no-video-data';
	}

	get iconURL()
	{
		return (this.streamData && this.streamData.thumbnail)? 
			this.streamData.thumbnail : constants.iconsUrl + 'stream.png';
	}

	get iconSize()
	{
		return 64;
	}

	updateData(info: ytdlinfo)
	{
		let formats: FormatData[] = [];

		for(let format of info.formats)
		{
			//todo: include the https as well and let user know it's downloadable with DM
			//also some sites this doesn't work : https://www.eporner.com/hd-porn/rhGx3hF80zs/Extreme-double-anal-gangbang-Back-at-Bruno-s-hideout/
			if(format.protocol === 'https') continue;
			formats.push(FormatData.getFromYTDLFormat(format));
		}

		let title = info.title;

		if(!title)
		{
			if(this.tabTitle)
			{
				title = this.tabTitle;
				if(this.ownerTabUrl)
				{
					let domain = Utils.getDomain(this.ownerTabUrl);
					title = Utils.removeSitenameFromTitle(title, domain);
				}
			}
			else
			{
				title = 'Unknown Title';
			}
		}

		let audioSize = Utils.getAudioSize(info);

		this.streamData = new StreamData(title, info.duration, info.thumbnail, formats, audioSize);
	}

	copyData(download: StreamDownload)
	{
		this.streamData = download.streamData;
	}
}

class YoutubeDownload extends StreamDownload implements YTDLableDownload<ytdlinfo, YoutubeDownload>
{
	type: download_type = 'YouTube Video';
	videoId: string;

	constructor(videoId: string, details: HTTPDetails, tabs: SureMap<number, tabinfo>)
	{
		super(details, tabs);
		this.videoId = videoId;
		this._hash_src = "ytvideo_" + videoId;
	}

	updateData(info: ytdlinfo)
	{
		let formats: FormatData[] = [];
		let resolutions = new Map<string, ytdl_format[]>();

		//create a map of useful formats 
		/*
		map looks like this
		{
			'144p': [],
			'240p': [],
			...
		}
		the values of the map are arrays of formats with that resolution
		for example 144p might have 4 different formats and further down the code we choose
		the best 144p from this array
		*/
		for(let format of info.formats)
		{
			if(format.vcodec === 'none' || !format.format_note) continue;

			let formatName = format.format_note;
			if(format.fps == 60) formatName += '60';

			if(!resolutions.has(formatName))
			{
				resolutions.set(formatName, []);
			}
			resolutions.get(formatName)?.push(format);
		}

		resolutions.forEach((resFormats) => 
		{
			let bestFormat: ytdl_format;

			if(resFormats.length === 0) return;

			if(resFormats.length === 1)
			{
				bestFormat = resFormats[0];
			}
			
			else
			{
				let found = resFormats.find((format) => {
					return (format.vcodec.startsWith('avc') && 
						format.container && format.container === 'mp4_dash');
				});

				if(!found)
				{
					found = resFormats.find((format) => {
						return (format.vcodec.startsWith('av') && 
							format.container && format.container === 'mp4_dash');
					});
				}

				if(!found)
				{
					found = resFormats.find((format) => {
						return (format.vcodec.startsWith('vp') && 
							format.container && format.container === 'webm_dash');
					});
				}

				bestFormat = (found)? found : resFormats[0];
			}

			formats.push(FormatData.getFromYTDLFormat(bestFormat));

		});

		//thumbnail
		//sort thumbnails based on their preference value
		info.thumbnails.sort((a, b) => {
			return b.preference - a.preference;
		});

		let found: undefined | ytdl_thumb = undefined;
		let thumbnail = info.thumbnail;

		//search for mqdefault.webp
		found = info.thumbnails.find((thumb) => {
			return Utils.splitGetLast(thumb.url, '/') === 'mqdefault.webp';
		});

		//search for the first thing with 320 width
		if(!found)
		{
			found = info.thumbnails.find((thumb) => {
				return thumb.width && thumb.width === 320;
			}); 
		}

		//search for the best thing that has at least 320*180 pixels
		if(!found)
		{
			found = info.thumbnails.find((thumb) => {
				if(thumb.width && thumb.height) {return thumb.width * thumb.height >= 320*180}
				return false;
			}); 
		}

		if(found)
		{
			thumbnail = found.url;
		}

		let audioSize = Utils.getAudioSize(info);

		this.streamData = new StreamData(info.title, info.duration, thumbnail, formats, audioSize);
	}
}

class YTPlaylistDownload extends GrabbedDownload implements YTDLableDownload<ytdlinfo_ytplitem[], YTPlaylistDownload>
{
	type: download_type = 'YouTube Playlist';
	listData: yt_playlist_data | undefined = undefined;
	listId: string;

	constructor(listId: string, details: HTTPDetails, tabs: SureMap<number, tabinfo>)
	{
		super(details, tabs);
		this.listId = listId;
		this._hash_src = "ytplaylist_" + listId;
	}

	get filename(): string
	{
		return (typeof this.listData != 'undefined')? this.listData.title : 'no-video-data';
	}

	get iconURL()
	{
		return constants.iconsUrl + 'playlist.png';
	}

	updateData(infos: ytdlinfo_ytplitem[])
	{
		let items: yt_playlist_item[] = [];

		for(let info of infos)
		{
			items.push({
				index: info.playlist_index,
				title: info.title,
				duration: info.duration,
				video_id: info.id,
				video_url: info.url,
				thumbnail: info.thumbnails[0].url,
				progress: undefined
			});
		}

		this.listData = {
			id: infos[0].playlist_id, 
			size: infos[0].playlist_count,
			title: infos[0].playlist_title,
			items: items
		};
	}

	updateProgress(prog: progress_data)
	{
		if(!this.listData || !prog.plIndex)
		{
			log.warn('cannot update playlist progress', this, prog);
			return;
		}

		//set the progress for the current item
		let currIndex = prog.plIndex - 1; //plIndex starts from 1
		this.listData.items[currIndex].progress = {percent: prog.percent, speed: prog.speed, status: 'Downloading'};
	}

	copyData(download: YTPlaylistDownload)
	{
		this.listData = download.listData;
	}
}

class RedditDownload extends StreamDownload implements YTDLableDownload<ytdlinfo, RedditDownload>
{
	type: download_type = 'Reddit Video';

	updateData(info: ytdlinfo)
	{
		let formats: FormatData[] = [];

		for(let format of info.formats)
		{
			if(!format.vcodec.startsWith('avc')) continue;
			if(typeof format.protocol != 'undefined' && format.protocol === 'https')
			{
				formats.push(FormatData.getFromYTDLFormat(format));
			}
		}

		let audioSize = Utils.getAudioSize(info);

		this.streamData = new StreamData(info.title, info.duration, info.thumbnail, formats, audioSize);
	}
}

/**
 * A class containing all sorts of functions to determine if a request is an 
 * actual download we are interested in
 */
class RequestFilter
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
	private _isCompressed: bool_und = undefined;
	private _isDocument: bool_und = undefined;
	private _isBinary: bool_und = undefined;
	private _isAudio: bool_und = undefined;
	private _isVideo: bool_und = undefined;
	private _isText: bool_und = undefined;
	private _isHlsManifest: bool_und = undefined;
	private _isDashManifest: bool_und = undefined;
	private _isDisplayedInBrowser: bool_und = undefined;
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

	constructor(public download: BaseDownload, public options: Options.GBOptions){}

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

	isVideo()
	{
		if(typeof this._isVideo === 'undefined'){
			this._isVideo = 
			this._isInExtensionList(constants.videoExts) ||
			this._isInMimeList(constants.videoMimes);
		}
		return this._isVideo;
	}

	isAudio()
	{
		if(typeof this._isAudio === 'undefined'){
			this._isAudio = 
			this._isInExtensionList(constants.audioExts) ||
			this._isInMimeList(constants.audioMimes);
		}
		return this._isAudio;
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

	isText()
	{
		if(typeof this._isText === 'undefined'){
			this._isText = 
			this._isInTypeList(constants.textualTypes) ||
			this._isInExtensionList(constants.textualExts) ||
			this._isInMimeList(constants.textualMimes);
		}
		return this._isText;
	}

	isBinary()
	{
		if(typeof this._isBinary === 'undefined'){
			this._isBinary = 
				this._isInExtensionList(constants.binaryExts) ||
				this._isInMimeList(constants.binaryMimes);
		}
		return this._isBinary;
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
		return 	this._isInMimeList(constants.videoMimes) || 
			this._isInMimeList(constants.audioMimes);
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
		return this._isInMimeList(constants.binaryMimes);
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
		return 	this._isInMimeList(constants.videoExts) || 
			this._isInMimeList(constants.audioExts);
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
	postdata: string,
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
	useragent: string;
	dlcount: number;
	optype: number;

	constructor(public links: DownloadInfo[], public referer: string, 
		public dlpageReferer: string, public dlpageCookies: string, 
		public dmName:string)
	{
		this.dlcount = links.length;
		this.useragent = navigator.userAgent;
		this.optype = 0;
	}

	/**
	 * Creates a job from a Download object
	 * @param dmName 
	 * @param download 
	 * @returns A DownloadJob object created from provided data
	 */
	static async getFromDownload(dmName: string, download: GrabbedDownload)
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
			postdata: download.getPostData() || '',
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
	static async getFromLinks(dmName: string, result: extracted_links)
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
			let desc = link.text;
			let linkCookies = await Utils.getCookies(href);
			let filename = Utils.getFileName(href);
			let extension = Utils.getExtFromFileName(filename);
			let downloadInfo: DownloadInfo = {
				url: href,
				desc: desc,
				cookies: linkCookies,
				postdata: '',
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
	name: string;
	width: number;
	height: number;
	fps: number;
	vcodec: vcodec;
	filesize: number;

	constructor(id: string, name: string, width: number, height: number, fps: number, 
		codec: vcodec, fileSize: number)
	{
		this.id = id;
		this.name = name;
		this.width = width;
		this.height = height;
		this.fps = fps;
		this.vcodec = codec;
		this.filesize = fileSize;
	}

	get pictureSize(): number
	{
		return this.width * this.height;
	}

	static getFromYTDLFormat(format: ytdl_format)
	{
		let id = format.format_id;
		let width = (format.width)? format.width : 0;
		let height = (format.height)? format.height : 0;
		let fps = (format.fps)? format.fps : 0;

		// file size
		let filesize = 0;
		if(format.filesize)
		{
			filesize = format.filesize;
		}
		else if(format.filesize_approx)
		{
			filesize = format.filesize_approx;
		}

		// codec
		let codec: vcodec = 'unknown';
		if(format.vcodec)
		{
			if(format.vcodec.startsWith('avc')) codec = 'avc';
			else if(format.vcodec.startsWith('av')) codec = 'av';
			else if(format.vcodec.startsWith('vp')) codec ='vp9';
		}

		// name
		let name = `Format #${id}`;
		if(format.format_note)
		{
			name = format.format_note;
		}
		else if(width && height)
		{
			let pictureSize = (width > height)? height : width;
			name = pictureSize.toString() + 'p';
		}

		return new FormatData(id, name, width, height, fps, codec, filesize);
	}
}

class StreamData
{
	title: string;
	duration: number;
	thumbnail: string | undefined;
	formats: FormatData[];
	audioSize: number;

	constructor(title: string, duration: number, thumbnail: string, 
		formats: FormatData[], audioSize: number)
	{
		this.title = title;
		this.duration = duration;
		this.thumbnail = thumbnail;
		this.formats = formats;
		this.audioSize = audioSize;
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
		return this.formatData.name;
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

	get fps(): number
	{
		return this.formatData.fps;
	}

	get fileSizeString(): string
	{
		let size = this.formatData.filesize;
		return (size > 0)? filesize(size, {round: 0}) : 'unknown size';
	}

	get vcodec(): vcodec
	{
		return this.formatData.vcodec;
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

	get audioSizeString(): string
	{
		let size = this.streamData.audioSize;
		return (size > 0)? filesize(size, {round: 0}) : 'unknown size';
	}
}

class tabinfo
{
	id: number;
	url: string;
	title: string;
	isPrivate: boolean;
	openerId: number | undefined;
	closed: boolean = false;

	constructor(tab: webx_tab)
	{
		this.id = tab.id;
		this.url = tab.url;
		this.title = tab.title;
		this.openerId = tab.openerTabId;
		this.isPrivate = tab.incognito;
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

class NativeAppVersionError extends Error{}