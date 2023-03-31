class DownloadHandler implements RequestHandler
{
	private download: BaseDownload;
	private filter: RequestFilter;

	private readonly ACT_GRAB = 'grab';
	private readonly ACT_IGNORE = 'ignore';
	private readonly ACT_FORCE_DL = 'force dl';
	private readonly ACT_GRAB_SILENT = 'grab silent';

	constructor(download: BaseDownload, filter: RequestFilter)
	{
		this.download = download;
		this.filter = filter;
	}

	handle()
	{
		//first determine its category
		this.determineCategory(this.download, this.filter);
		//then group similar categories together into a class
		this.determineClass(this.download, this.filter);
		//then determine the action based on what class the request is
		let action = this.determineAction(this.download, this.filter);
		return this.performAction(this.download, action);
	}

	/**
	 * Determines the category of a request
	 * Category is one of those defined in ReqFilter
	 * @param download 
	 * @param filter 
	 */
	private determineCategory(download: BaseDownload, filter: RequestFilter)
	{
		/**
		 * use types to determine category first, because they are the most certain
		 */
		if(filter.isTypeWebRes()){
			download.cat = RequestFilter.CAT_WEBRES_API;
			return;
		}
		if(filter.isTypeMedia()){
			download.cat = RequestFilter.CAT_MEDIA_API;
			return;
		}
		if(filter.isTypeWebOther()){
			download.cat = RequestFilter.CAT_OTHERWEB_API;
			return;
		}

		/**
		 * then use mimes because mime is more certain than extension except binary mimes
		 */
		if(filter.isMimeWebRes()){
			download.cat = RequestFilter.CAT_WEB_RES;
			return;
		}
		if(filter.isMimeWebOther()){
			download.cat = RequestFilter.CAT_OTHER_WEB;
			return;
		}
		if(filter.isMimeMedia()){
			download.cat = RequestFilter.CAT_FILE_MEDIA;
			return;
		}
		if(filter.isMimeCompressed()){
			download.cat = RequestFilter.CAT_FILE_COMP;
			return;
		}
		if(filter.isMimeDocument()){
			download.cat = RequestFilter.CAT_FILE_DOC;
			return;
		}

		/**
		 * use extension to determine what category this request is
		 */
		if(filter.isExtWebRes()){
			download.cat = RequestFilter.CAT_WEB_RES;
			return;
		}
		if(filter.isExtWebOther()){
			download.cat = RequestFilter.CAT_OTHER_WEB;
			return;
		}
		if(filter.isExtMedia()){
			download.cat = RequestFilter.CAT_FILE_MEDIA;
			return;
		}
		if(filter.isExtCompressed()){
			download.cat = RequestFilter.CAT_FILE_COMP;
			return;
		}
		if(filter.isExtDocument()){
			download.cat = RequestFilter.CAT_FILE_DOC;
			return;
		}
		if(filter.isExtBinary()){
			download.cat = RequestFilter.CAT_FILE_BIN;
			return;
		}

		//this is 'application/octet-steam' and 'application/binary'
		//this is vague and the extension takes precedence to it so we put it at the end
		if(filter.isMimeGeneralBinary()){
			download.cat = RequestFilter.CAT_FILE_BIN;
			return;
		}

		download.cat = RequestFilter.CAT_UKNOWN;
		return;

	}
	 
	/**
	 * Determines what action should be done about a request 
	 * @param download 
	 * @param filter 
	 */
	private determineClass(download: BaseDownload, filter: RequestFilter)
	{
		if(download.cat === RequestFilter.CAT_WEBRES_API){
			download.classReason = 'web res api';
			download.class = RequestFilter.CLS_INLINE_WEB_RES;
		}
		else if(download.cat === RequestFilter.CAT_OTHERWEB_API){
			download.classReason = 'other web api';
			download.class = RequestFilter.CLS_WEB_OTHER;
		}
		else if(download.cat === RequestFilter.CAT_MEDIA_API){
			download.classReason = 'media api';
			download.class = RequestFilter.CLS_INLINE_MEDIA;
		}

		//these aren't from API so we aren't so sure about them
		else if(download.cat === RequestFilter.CAT_OTHER_WEB){
			download.classReason = 'other web';
			download.class = RequestFilter.CLS_WEB_OTHER;
		}
		else if(filter.hasAttachment()){
			download.classReason = 'attachment';
			download.class = RequestFilter.CLS_DOWNLOAD;
		}
		else if(download.cat === RequestFilter.CAT_WEB_RES){
			download.classReason = 'web res';
			download.class = RequestFilter.CLS_INLINE_WEB_RES;
		}
		else if(
			download.cat === RequestFilter.CAT_FILE_MEDIA ||
			download.cat === RequestFilter.CAT_FILE_COMP ||
			download.cat === RequestFilter.CAT_FILE_DOC ||
			download.cat === RequestFilter.CAT_FILE_BIN
		){
			download.classReason = 'known file type';
			download.class = RequestFilter.CLS_DOWNLOAD;
		}

		//as a last resort if the request does not have documentUrl or originUrl and 
		//has an extension then consider it a download
		//this should cover unknown file type downloads too
		else if
		(
			(!download.httpDetails.documentUrl || !download.httpDetails.originUrl) &&
			download.fileExtension !== 'unknown'
		){
			download.classReason = 'extension with no document/origin'
			download.class = RequestFilter.CLS_DOWNLOAD;
		}

	}
	 
	/**
	 * Determines what action should be done about a request 
	 * @param download 
	 * @param filter 
	 */
	private determineAction(download: BaseDownload, filter: RequestFilter): string
	{
		let act = this.ACT_IGNORE;

		if(download.class === RequestFilter.CLS_WEB_OTHER){
			act = this.ACT_IGNORE;
		}

		if(download.class === RequestFilter.CLS_INLINE_WEB_RES){
			if(Options.opt.excludeWebFiles){
				act = this.ACT_IGNORE;
			}
			else{
				act = this.ACT_GRAB_SILENT;
			}
		}

		else if(download.class === RequestFilter.CLS_INLINE_MEDIA){
			act = this.ACT_GRAB_SILENT;
		}

		else if(download.class === RequestFilter.CLS_DOWNLOAD){
			if( !filter.hasAttachment() && filter.isDisplayedInBrowser() ){
				act = this.ACT_GRAB_SILENT;
			}
			else{
				act = this.ACT_GRAB;
			}
		}

		//overrides
		if(download.class === RequestFilter.CLS_DOWNLOAD && filter.isForcedInOpts()){
			download.classReason = 'opts-force';
			return this.ACT_FORCE_DL;
		}

		if(act === this.ACT_GRAB && Options.opt.forceDefaultDM)
		{
			act = this.ACT_FORCE_DL;
		}

		if(download.class === RequestFilter.CLS_DOWNLOAD && filter.isIncludedInOpts()){
			download.classReason = 'opts-include';
			return this.ACT_GRAB;
		}

		return act;
	}

	/**
	 * Performs the action that is assigned to a request in determineAction()
	 * @param download 
	 */
	private performAction(download: BaseDownload, act: string): Promise<webx_BlockingResponse>
	{
		//console.timeEnd(download.reqDetails.requestId);

		if(act === this.ACT_IGNORE){
			return Promise.resolve({cancel: false});
		}

		//todo: if a file is generated with a different URL each time we open a page
		//then consequent openings of that page adds the same file to the download list
		//example: https://tporn.xxx/en/video/10035255/eben18-ich-wollte-unbedingt-mal-mit-einem-groben-schwanz-bumsen/
		//warning: example is porn

		let newDL: FileDownload;
		let fileType = Utils.getFileType(this.filter);
		switch(fileType)
		{
			case 'Audio':
				newDL = new AudioDownload(download.httpDetails, GB.tabs);
				break;

			case 'Binary':
				newDL = new BinaryDownload(download.httpDetails, GB.tabs);
				break;

			case 'Compressed Archive':
				newDL = new CompressedDownload(download.httpDetails, GB.tabs);
				break;
			
			case 'Document':
				newDL = new DocumentDownload(download.httpDetails, GB.tabs);
				break;

			case 'Image':
				newDL = new ImageDownload(download.httpDetails, GB.tabs);
				break;

			case 'Text':
				newDL = new TextDownload(download.httpDetails, GB.tabs);
				break;

			case 'Video File':
				newDL = new VideoDownload(download.httpDetails, GB.tabs);
				break;

			case 'Other':
				newDL = new OtherFileDownload(download.httpDetails, GB.tabs);
				break;
		}

		GB.addToAllDownloads(newDL);
		Utils.showPageAction(newDL.ownerTabId);

		if(act === this.ACT_FORCE_DL)
		{
			let dmName = Options.opt.defaultDM;
			DownloadJob.getFromDownload(dmName, newDL).then((job)=>{
				GB.doDownloadJob(job);
			});
			return Promise.resolve({cancel: true});
		}

		if(act === this.ACT_GRAB && Options.opt.overrideDlDialog)
		{
			//only firefox supports this
			//if we don't have a download manager installed no point in asking what to do
			if(GB.browser.name !== 'firefox')
			{
				log.warn('this browser does not support overriding the download dialog');
				return Promise.resolve({cancel: false});
			}
			else if(typeof GB.availableDMs === 'undefined')
			{
				log.warn('no download managers found on the system');
				return Promise.resolve({cancel: false});
			}

			//the request will be paused until this promise is resolved
			return new Promise(function(resolve)
			{
				newDL.resolveRequest = resolve;
				let dlWindow = new DownloadWindow(newDL);
				dlWindow.display();
			});
		}

		//for safety in case nothing above runs
		return Promise.resolve({cancel: false});	
	}
}