class Utils {

	/**
	 * Gets domain name of a url
	 * @param {string} url 
	 */
	static getDomain(url){
		let a = document.createElement('a');
		a.href = url;
		return a.hostname;
	}

	/**
	 * Gets path part of a url
	 * @param {string} url 
	 */
	static getPath(url){
		let a = document.createElement('a');
		a.href = url;
		return a.pathname;
	}

	/**
	 * 		
	 * @param {DownloadJob} job 
	 */
	static async performJob(job){
		let browserDMs = await DMHelper.getAvailableDMs();
		if(browserDMs.includes(job.dmName)){
			DMHelper.dms[job.dmName].download(job);
		}
		else{
			NativeMessaging.download(job);
		}
	}

}