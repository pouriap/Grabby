var DG = DG || {};

DG.Utils = {

	/**
	 * Gets domain name of a url
	 * @param {string} url 
	 */
	getDomain: function(url){
		let a = document.createElement('a');
		a.href = url;
		return a.hostname;
	},

	/**
	 * Gets path part of a url
	 * @param {string} url 
	 */
	getPath: function(url){
		let a = document.createElement('a');
		a.href = url;
		return a.pathname;
	}

}