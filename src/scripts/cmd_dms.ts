class CommandLineDM
{
	static DMNAME: string = 'Custom Command';

	/**
	 * placeholders:
     * [URL] - the URL of the current link
     * [REFERER] - the URL of the document containing current link
     * [COOKIE] - cookie info for the current link
     * [FOLDER] - the folder where user wants to save its download (it will be asked with a dialog is show save-as dialog is checked in options)
     * [POST] - data to be sent with POST request if a form button has triggered this download
     * [ULIST] - expands to all the URLs to be downloaded, space separated
     * //[UFILE] - path to a file containing the URLs to be downloaded, one per line
     * //[CFILE] - path to the cookie.txt file for the current profile
     * [FNAME] - guessed filename for multimedia download (usually extrapolated from the title)
	 */

	download(job: DownloadJob)
	{
		log.d('download custom cmd job', job);

		let cmd = Options.opt.customDM;
		let showConsole = Options.opt.showConsoleWindow;
		let showSaveas = Options.opt.showSaveasWindow;

		if(!cmd)
		{
			log.warn('no custom command specified');
			Utils.notification('Error', 'No custom command specified');
			return;
		}

		let urls: string[] = [];
		for(let link of job.links)
		{
			urls.push(link.url);
		}
		
		let url = job.links[0].url;
		let post = job.links[0].postdata;
		let filename = job.links[0].filename;
		let referer = job.referer;
		let cookie = job.dlpageCookies;
		let ulist = urls.join(' ');

		cmd = cmd
			.replace('[URL]', url)
			.replace('[REFERER]', referer)
			.replace('[COOKIE]', cookie)
			.replace('[POST]', post)
			.replace('[ULIST]', ulist)
			.replace('[FNAME]', filename)
			.replace('[FOLDER]', '*$*FOLDER*$*');

		// crappy c++ json library cannot handle double quotes in strings
		let cmd64 = btoa(cmd);

		let msg = new NativeMessaging.MSG_UserCMD(cmd64, filename, showConsole, showSaveas);
		NativeMessaging.sendMessage(msg);
	}

}