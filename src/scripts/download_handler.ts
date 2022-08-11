class DownloadHandler implements RequestHandler
{
	download: Download;
	filter: ReqFilter;

	private readonly ACT_GRAB = 'grab';
	private readonly ACT_IGNORE = 'ignore';
	private readonly ACT_FORCE_DL = 'force dl';
	private readonly ACT_GRAB_SILENT = 'grab silent';

	constructor(download: Download, filter: ReqFilter)
	{
		this.download = download;
		this.filter = filter;
	}

	/**
	 * Handles a download
	 * @param download 
	 * @param filter 
	 */
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
	private determineCategory(download: Download, filter: ReqFilter)
	{
		/**
		 * use types to determine category first, because they are the most certain
		 */
		if(filter.isTypeWebRes()){
			download.cat = ReqFilter.CAT_WEBRES_API;
			return;
		}
		if(filter.isTypeMedia()){
			download.cat = ReqFilter.CAT_MEDIA_API;
			return;
		}
		if(filter.isTypeWebOther()){
			download.cat = ReqFilter.CAT_OTHERWEB_API;
			return;
		}

		/**
		 * then use mimes because mime is more certain than extension except binary mimes
		 */
		if(filter.isMimeWebRes()){
			download.cat = ReqFilter.CAT_WEB_RES;
			return;
		}
		if(filter.isMimeWebOther()){
			download.cat = ReqFilter.CAT_OTHER_WEB;
			return;
		}
		if(filter.isMimeMedia()){
			download.cat = ReqFilter.CAT_FILE_MEDIA;
			return;
		}
		if(filter.isMimeCompressed()){
			download.cat = ReqFilter.CAT_FILE_COMP;
			return;
		}
		if(filter.isMimeDocument()){
			download.cat = ReqFilter.CAT_FILE_DOC;
			return;
		}

		/**
		 * use extension to determine what category this request is
		 */
		if(filter.isExtWebRes()){
			download.cat = ReqFilter.CAT_WEB_RES;
			return;
		}
		if(filter.isExtWebOther()){
			download.cat = ReqFilter.CAT_OTHER_WEB;
			return;
		}
		if(filter.isExtMedia()){
			download.cat = ReqFilter.CAT_FILE_MEDIA;
			return;
		}
		if(filter.isExtCompressed()){
			download.cat = ReqFilter.CAT_FILE_COMP;
			return;
		}
		if(filter.isExtDocument()){
			download.cat = ReqFilter.CAT_FILE_DOC;
			return;
		}
		if(filter.isExtBinary()){
			download.cat = ReqFilter.CAT_FILE_BIN;
			return;
		}

		//this is 'application/octet-steam' and 'application/binary'
		//this is vague and the extension takes precedence to it so we put it at the end
		if(filter.isMimeGeneralBinary()){
			download.cat = ReqFilter.CAT_FILE_BIN;
			return;
		}

		download.cat = ReqFilter.CAT_UKNOWN;
		return;

	}
	 
	/**
	 * Determines what action should be done about a request 
	 * @param download 
	 * @param filter 
	 */
	private determineClass(download: Download, filter: ReqFilter)
	{
		if(download.cat === ReqFilter.CAT_WEBRES_API){
			download.classReason = 'web res api';
			download.class = ReqFilter.CLS_INLINE_WEB_RES;
		}
		else if(download.cat === ReqFilter.CAT_OTHERWEB_API){
			download.classReason = 'other web api';
			download.class = ReqFilter.CLS_WEB_OTHER;
		}
		else if(download.cat === ReqFilter.CAT_MEDIA_API){
			download.classReason = 'media api';
			download.class = ReqFilter.CLS_INLINE_MEDIA;
		}

		//these aren't from API so we aren't so sure about them
		else if(download.cat === ReqFilter.CAT_OTHER_WEB){
			download.classReason = 'other web';
			download.class = ReqFilter.CLS_WEB_OTHER;
		}
		else if(filter.hasAttachment()){
			download.classReason = 'attachment';
			download.class = ReqFilter.CLS_DOWNLOAD;
		}
		else if(download.cat === ReqFilter.CAT_WEB_RES){
			download.classReason = 'web res';
			download.class = ReqFilter.CLS_INLINE_WEB_RES;
		}
		else if(
			download.cat === ReqFilter.CAT_FILE_MEDIA ||
			download.cat === ReqFilter.CAT_FILE_COMP ||
			download.cat === ReqFilter.CAT_FILE_DOC ||
			download.cat === ReqFilter.CAT_FILE_BIN
		){
			download.classReason = 'known file type';
			download.class = ReqFilter.CLS_DOWNLOAD;
		}

		//as a last resort if the request does not have documentUrl or originUrl and 
		//has an extension then consider it a download
		//this should cover unknown file type downloads too
		else if
		(
			(!download.resDetails.documentUrl || !download.resDetails.originUrl) &&
			download.fileExtension !== 'unknown'
		){
			download.classReason = 'extension with no document/origin'
			download.class = ReqFilter.CLS_DOWNLOAD;
		}

	}
	 
	/**
	 * Determines what action should be done about a request 
	 * @param download 
	 * @param filter 
	 */
	private determineAction(download: Download, filter: ReqFilter): string
	{
		let act = this.ACT_IGNORE;

		if(download.class === ReqFilter.CLS_WEB_OTHER){
			act = this.ACT_IGNORE;
		}

		if(download.class === ReqFilter.CLS_INLINE_WEB_RES){
			if(DLG.options.excludeWebFiles){
				act = this.ACT_IGNORE;
			}
			else{
				act = this.ACT_GRAB_SILENT;
			}
		}

		else if(download.class === ReqFilter.CLS_INLINE_MEDIA){
			act = this.ACT_GRAB_SILENT;
		}

		else if(download.class === ReqFilter.CLS_DOWNLOAD){
			if( !filter.hasAttachment() && filter.isDisplayedInBrowser() ){
				act = this.ACT_GRAB_SILENT;
			}
			else{
				act = this.ACT_GRAB;
			}
		}

		//overrides
		if(download.class === ReqFilter.CLS_DOWNLOAD && filter.isForcedInOpts()){
			download.classReason = 'opts-force';
			return this.ACT_FORCE_DL;
		}

		if(download.class === ReqFilter.CLS_DOWNLOAD && filter.isIncludedInOpts()){
			download.classReason = 'opts-include';
			return this.ACT_GRAB;
		}

		return act;
	}

	/**
	 * Performs the action that is assigned to a request in determineAction()
	 * @param download 
	 */
	private performAction(download: Download, act: string): Promise<webx_BlockingResponse>
	{
		//console.timeEnd(download.reqDetails.requestId);

		if(act === this.ACT_IGNORE){
			return Promise.resolve({cancel: false});
		}

		//todo: if a file is generated with a different URL each time we open a page
		//then consequent openings of that page adds the same file to the download list
		//example: https://tporn.xxx/en/video/10035255/eben18-ich-wollte-unbedingt-mal-mit-einem-groben-schwanz-bumsen/
		//warning: example is porn

		DLG.addToAllDownloads(download);

		if(act === this.ACT_FORCE_DL){
			let dmName = Options.getDefaultDM();
			DownloadJob.getFromDownload(dmName, download).then((job)=>{
				DLG.doDownloadJob(job);
			});
			return Promise.resolve({cancel: true});
		}

		if(act === this.ACT_GRAB && DLG.options.overrideDlDialog){
			//the request will be paused until this promise is resolved
			return new Promise(function(resolve)
			{
				//@ts-ignore	this be something special
				download.resolve = resolve;
				DLG.showDlDialog(download);
			});
		}

		//for safety in case nothing above runs
		return Promise.resolve({cancel: false});	
	}
}