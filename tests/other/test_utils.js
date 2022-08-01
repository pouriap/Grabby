var app;

function initApp(options){
	app = new DlGrabApp([]);
	Options.apply(options);
	app.runtime.blacklist = [];
}

function req(dlInfo){
	let handler = new RequestFiltering(app);
	handler.performAction = function (download, app) {
		return download.act;
	}
	let info = JSON.parse(dlInfo);
	let reqDetails = info.reqDetails;
	let resDetails = info.resDetails;
	handler.doOnBeforeRequest(reqDetails, app);
	handler.doOnBeforeSendHeaders(reqDetails, app);
	return handler.doOnHeadersReceived(resDetails, app, handler);
};