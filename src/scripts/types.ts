type bool_und = boolean | undefined;
type str_und = string | undefined;
type num_und = number | undefined;
type pair = {name: string, value: string};
type webx_BlockingResponse = {cancel: boolean};
type webx_HTTPHeaders = pair[];
type webx_common = {
	requestId: string;
	tabId: number;
	url: string;
	originUrl: string;
	documentUrl: string;
	method: string;
	type: "beacon" | "csp_report" | "font" | "image" | "imageset" | "main_frame" | "media" | "object" | "object_subrequest" | "ping" | "script" | "speculative" | "stylesheet" | "sub_frame" | "web_manifest" | "websocket" | "xbl" | "xml_dtd" | "xmlhttprequest" | "xslt" | "other";
}
type webx_beforeRequest = webx_common & {
	incognito: boolean;
	requestBody: {error: string, formData: {[index: string]: any}};
}
type webx_beforeSendHeaders = webx_common & {
	requestHeaders: webx_HTTPHeaders;
}
type webx_headersReceived = webx_common & {
	responseHeaders: webx_HTTPHeaders;
	statusCode: number;
	timeStamp: number;
	fromCache: boolean;
}
type HTTPDetails = webx_beforeRequest & webx_beforeSendHeaders & webx_headersReceived & {
	postData: string;
}