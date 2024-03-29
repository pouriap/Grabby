class CommandLineDM
{
	static DMNAME: string = 'Custom Command';

	/**
	 * placeholders:
     * [URL] - the URL of the current link
     * [REFERER] - the URL of the document containing current link
     * [COOKIE] - cookie info for the current link
     * [OUTPUT] - output path to save the download (it will be asked with a dialog is show save-as dialog is checked in options)
     * [POST] - data to be sent with POST request if a form button has triggered this download
     * [ULIST] - expands to all the URLs to be downloaded, space separated
     * //[UFILE] - path to a file containing the URLs to be downloaded, one per line
     * //[CFILE] - path to the cookie.txt file for the current profile
     * [FNAME] - guessed filename for multimedia download (usually extrapolated from the title)
	 */

	download(job: DownloadJob)
	{
		log.d('download custom cmd job', job);

		let procName = Options.opt.customProc;
		let cmd = Options.opt.customCmd;
		let showConsole = Options.opt.showConsoleWindow;
		let showSaveas = Options.opt.showSaveasWindow;

		if(!cmd)
		{
			log.warn('no custom command specified');
			Notifs.create('Error', 'No custom command specified');
			return;
		}

		let urls: string[] = [];
		for(let link of job.links)
		{
			urls.push(link.url);
		}
	
		let url = job.links[0].url;
		let post = job.links[0].postdata;
		let cookie = (job.links.length > 1)? job.dlpageCookies : job.links[0].cookies;
		let filename = job.links[0].filename;
		let referer = job.referer;

		// sanitize
		let q = '';
		
		if(Options.opt.autoQuoteCustomCmd)
		{
			q = (GB.browser.os == 'windows')? '"' : "'";
			
			for(let i=0; i<urls.length; i++)
			{
				urls[i] = q + urls[i] + q;
			}
		}

		let ulist = urls.join(' ');

		let args = Utils.parseCmdArgs(cmd);
		log.d('args be', args);

		for(let i=0; i<args.length; i++)
		{
			args[i] = args[i]
				.replace('[URL]', url)
				.replace('[REFERER]', referer)
				.replace('[COOKIE]', cookie)
				.replace('[POST]', post)
				.replace('[ULIST]', ulist)
				.replace('[FNAME]', filename)
				.replace('[OUTPUT]', '*$*OUTPUT*$*');
			args[i] = btoa(args[i]);
		};

		let msg = new NativeMessaging.MSG_UserCMD(procName, args, filename, showConsole, showSaveas);
		NativeMessaging.sendMessage(msg);
	}

}