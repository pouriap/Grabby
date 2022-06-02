class OptionUtils {



	static async loadForUI(){
		let options = await browser.storage.local.get(OptionUtils.getDefaults());
		let uiOpts = {};
		for(let optName in options){
			let optionVal = options[optName];
			let optionData = OptionUtils.optionsData[optName];
			uiOpts[optName] = {};
			Object.assign(uiOpts[optName], optionData);
			uiOpts[optName].name = optName;
			uiOpts[optName].value = optionVal;
			uiOpts[optName].extra = (optionData.extra)?
				await OptionUtils._getExtra(optionVal, optionData.extra) : '';
		}
		return uiOpts;
	}

	static _getExtra(optionVal, extra){
		switch(extra){
			case 'get-available-dms':
				return DLG.runtime.availableDMs;
		}
	}

	static load(){
		return browser.storage.local.get(OptionUtils.getDefaults());
	}

	static save(options){
		browser.storage.local.set(options);
	}

	static getDefaults(){
		let defaultOptions = {};
		for(let optionName in OptionUtils.optionsData){
			defaultOptions[optionName] = OptionUtils.optionsData[optionName].default;
		}
		return defaultOptions;
	}

}

OptionUtils.optionsData= {

	overrideDlDialog: {
		type: 'checkbox',
		default: true,
		desc: "Override Firefox's download dialog",
	},
	playMediaInBrowser: {
		type: 'checkbox',
		default: true,
		desc: "Do not offer to download files that can be displayed inside browser (text, media and pdf)",
	},
	dlListSize: {
		type: 'textbox',
		default: '20',
		desc: 'Number of items to keep in downloads history:',
		endsection: true,
	},

	grabFilesLargerThanMB: {
		type: 'textbox',
		default: '0',
		desc: "Ignore files smaller than (MB):"
	},
	excludeWebFiles: {
		type: 'checkbox',
		default: true,
		desc: "Ignore common web files (images, fonts, etc.)",
	},
	excludedExts: {
		type: 'textbox',
		default: '',
		desc: "Ignore files with these extensions:",
		process: 'get-exts-from-list',
		attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
	},
	includedExts: {
		type: 'textbox',
		default: '',
		desc: "Detect files with these extensions as downloads:",
		process: 'get-exts-from-list',
		attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
	},
	forcedExts: {
		type: 'textbox',
		default: '',
		desc: "Directly download files with these extensions with my default manager:",
		process: 'get-exts-from-list',
		attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
	},
	blacklistDomains: {
		type: 'textbox',
		default: '',
		desc: "Do not grab from these domains:",
		process: 'get-vals-from-list',
		attrs: [{name: 'placeholder', value: 'example.com,example.org,...'}],
		endsection: true,
	},

	defaultDM: {
		type: 'dropdown',
		default: '',
		desc: "Default download manager: ",
		extra: 'get-available-dms',
	},

}