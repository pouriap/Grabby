type bool_und = boolean | undefined;
type str_und = string | undefined;
type num_und = number | undefined;
type pair = {name: string, value: string};
type webx_BlockingResponse = {cancel: boolean};
type webx_HTTPHeaders = pair[];
type webx_reqCommon = {
	requestId: string;
	tabId: number;
	url: string;
	originUrl: string | undefined;
	documentUrl: string | undefined;
	method: string;
	type: "beacon" | "csp_report" | "font" | "image" | "imageset" | "main_frame" | "media" | "object" | "object_subrequest" | "ping" | "script" | "speculative" | "stylesheet" | "sub_frame" | "web_manifest" | "websocket" | "xbl" | "xml_dtd" | "xmlhttprequest" | "xslt" | "other";
}
type webx_beforeRequest = webx_reqCommon & {
	incognito: boolean;
	requestBody: {error: string, formData: {[index: string]: any}};
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
type HTTPDetails = webx_beforeRequest & webx_beforeSendHeaders & webx_headersReceived & {
	postData: string;
}
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
interface webx_browser
{
	tabs: {
		query: (arg: any) => Promise<webx_tab[]>;
		get: (arg: number) => Promise<webx_tab>;
		remove: (arg: number | number[]) => Promise<any>;
		executeScript: (tabId: number, details: {code?: string, file?: string}) => Promise<any[]>;
		onCreated: any;
		onUpdated: any;
		onRemoved: any;
	};
	webRequest: any;
	runtime: any;
	windows: any;
	downloads: any;
	notifications: any;
	cookies: any;
	storage: any;
	browserAction: any;
	menus: any;
}