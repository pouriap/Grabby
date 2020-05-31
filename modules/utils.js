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

}