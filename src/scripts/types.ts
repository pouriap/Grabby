type bool_und = boolean | undefined;

type str_und = string | undefined;

type num_und = number | undefined;

type pair = {name: string, value: string};

type browser_name = 'firefox' | 'chrome' | 'unknown';

type browser_info = {name: browser_name, version: number | undefined};

type filetype =  typeof constants.fileTypes[number];

type download_type = filetype | 'stream' | 'youtube-video' | 'youtube-playlist' | 'reddit-video';

type vcodec = 'avc' | 'av' | 'vp9' | 'unknown';

type page_link = {href: string, text: string};

type list_window_type = 'all_links' | 'selection_links' | 'yt_playlist';

type progress_data = {dlHash: string, plIndex: number, speed: string, percent: number};

type dl_progress = {percent: number, speed: string};

type extracted_links = 
{
	links: page_link[],
	originPageUrl: string,
	originPageReferer: string
};

type webx_BlockingResponse = {cancel: boolean};

type webx_HTTPHeaders = pair[];

type webx_reqCommon = 
{
	requestId: string;
	tabId: number;
	url: string;
	originUrl: string | undefined;
	documentUrl: string | undefined;
	method: string;
	type: "beacon" | "csp_report" | "font" | "image" | "imageset" | "main_frame" | "media" | "object" | "object_subrequest" | "ping" | "script" | "speculative" | "stylesheet" | "sub_frame" | "web_manifest" | "websocket" | "xbl" | "xml_dtd" | "xmlhttprequest" | "xslt" | "other";
}

type webx_formData = {[index: string]: string[]};
type webx_uploadData = {bytes?: any, file?: string};
type webx_requestBody = {error?: string, formData?: webx_formData, raw?: webx_uploadData[]};

type webx_beforeRequest = webx_reqCommon & {
	incognito: boolean;
	requestBody?: webx_requestBody;
}

type webx_beforeSendHeaders = webx_reqCommon & {
	requestHeaders: webx_HTTPHeaders;
}

type webx_headersReceived = webx_reqCommon & {
	responseHeaders: webx_HTTPHeaders;
	statusCode: number;
	timeStamp: number;
	fromCache: boolean;
}

type HTTPDetails = webx_beforeRequest & webx_beforeSendHeaders & webx_headersReceived;

type webx_tab = 
{
	active: boolean;
	attention?: boolean;
	favIconUrl: boolean;
	hidden: boolean;
	id: number;
	incognito: boolean;
	index: number;
	openerTabId?: number;
	status: string;
	successorTabId?: number;
	title: string;
	url: string;
	windowId: number;
}

type webx_execScriptDetails = {code?: string, file?: string};

interface webx_browser
{
	tabs: {
		query: (arg: any) => Promise<webx_tab[]>;
		get: (arg: number) => Promise<webx_tab>;
		remove: (arg: number | number[]) => Promise<any>;
		executeScript: (tabId: number, details: webx_execScriptDetails) => Promise<any[]>;
		onCreated: any;
		onUpdated: any;
		onRemoved: any;
	};
	pageAction: {
		show: (tabId: number) => void;
		hide: (tabId: number) => void;
	};
	webRequest: any;
	runtime: any;
	windows: {
		create: (arg: any) => Promise<webx_window>;
		getCurrent: (arg: any) => Promise<webx_window>;
		onRemoved: any;
	};
	downloads: any;
	notifications: any;
	cookies: any;
	storage: any;
	browserAction: any;
	menus: any;
}

interface webx_chrome
{
	contextMenus: any
}

type webx_window = 
{
	focused: boolean;
	height?: number;
	id?: number;
	incognito: boolean;
	left?: number;
	sessionId: string;
	tabs: webx_tab[];
	title: string;
	top?: number;
	width?: number;
}

type ytdl_format =
{
	asr: number;
	filesize: number | undefined;
	filesize_approx: number | undefined;
	format_id: string;
	format_note: string | null;
	height: number | null;
	has_drm: boolean;
	url: string;
	width: number | null;
	ext: string;
	vcodec: "none" | string;
	acodec: "none" | string;
	container: string;
	protocol: string;
	audio_ext: "none" | string;
	video_ext: "none" | string;
	format: string;
	resolution: string;
	fps: number;
}

type ytdl_thumb =
{
	url: string,
	preference: number,
	id: string,
	height?: number,
	width?: number,
	resolution?: string
}

type ytdlinfo =
{
	id: string;
	title: string;
	formats: ytdl_format[];
	thumbnail: string;
	thumbnails: ytdl_thumb[];
	uploader: string;
	uploader_id: string;
	uploader_url: string;
	channel_id: string;
	channel_url: string;
	duration: number;
	view_count: number;
	age_limit: 0;
	webpage_url: string;
	playable_in_embed: boolean;
	is_live: boolean;
	was_live: boolean;
	live_status: string;
	like_count: number;
	channel: string
	original_url: string;
	display_id: string;
	fulltitle: string;
}

type ytdlinfo_ytplitem = ytdlinfo &
{
	url: string;
	thumbnails: {url: string, height: number, width: number}[];
	playlist_id: string;
	playlist: string;
	duration: number;
	playlist_title: string;
	playlist_index: number;
	playlist_count: number;
}

type yt_playlist_item =
{
	index: number;
	title: string;
	video_id: string;
	video_url: string;
	thumbnail: string;
	duration: number;
	progress: dl_progress | undefined;
}

type yt_playlist_data =
{
	id: string;
	title: string;
	size: number;
	items: yt_playlist_item[];
}