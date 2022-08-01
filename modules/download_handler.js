class DownloadHandler
{
	/**
	 * Handles a download
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 */
	static handle(download, filter)
	{
		//first determine its category
		DownloadHandler.determineCategory(download, filter);
		//then group similar categories together into a class
		DownloadHandler.determineClass(download, filter);
		//then determine the action based on what class the request is
		DownloadHandler.determineAction(download, filter);
	}

	/**
	 * Determines the category of a request
	 * Category is one of those defined in ReqFilter
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 */
	static determineCategory(download, filter)
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
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 */
	static determineClass(download, filter)
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
			download.getFileExtension() !== 'unknown'
		){
			download.classReason = 'extension with no document/origin'
			download.class = ReqFilter.CLS_DOWNLOAD;
		}

	}
	 
	/**
	 * Determines what action should be done about a request 
	 * @param {Download} download 
	 * @param {ReqFilter} filter 
	 */
	static determineAction(download, filter)
	{
		if(download.class === ReqFilter.CLS_WEB_OTHER){
			download.act = ReqFilter.ACT_IGNORE;
		}

		if(download.class === ReqFilter.CLS_INLINE_WEB_RES){
			if(DLG.options.excludeWebFiles){
				download.act = ReqFilter.ACT_IGNORE;
			}
			else{
				download.act = ReqFilter.ACT_GRAB_SILENT;
			}
		}

		else if(download.class === ReqFilter.CLS_INLINE_MEDIA){
			download.act = ReqFilter.ACT_GRAB_SILENT;
		}

		else if(download.class === ReqFilter.CLS_DOWNLOAD){
			if( !filter.hasAttachment() && filter.isDisplayedInBrowser() ){
				download.act = ReqFilter.ACT_GRAB_SILENT;
			}
			else{
				download.act = ReqFilter.ACT_GRAB;
			}
		}

		//overrides
		if(download.class === ReqFilter.CLS_DOWNLOAD && filter.isForcedInOpts()){
			download.classReason = 'opts-force';
			download.act = ReqFilter.ACT_FORCE_DL;
			return;
		}

		if(download.class === ReqFilter.CLS_DOWNLOAD && filter.isIncludedInOpts()){
			download.classReason = 'opts-include';
			download.act = ReqFilter.ACT_GRAB;
			return;
		}

	}
}