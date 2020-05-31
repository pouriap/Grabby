class Options {

	constructor(availableDMs){
		this.availableDMs = availableDMs;
	}

	loadWithData(){
		return new Promise(async (resolve) => {
			let options = await browser.storage.local.get(Options.getDefaults());
			for(let optName of Object.keys(options)){
				let optionVal = options[optName];
				let optionData = Options.optionsData[optName];
				options[optName] = {};
				options[optName].name = optName;
				options[optName].type = optionData.type;
				options[optName].desc = optionData.desc;
				options[optName].value = optionVal;
				options[optName].extra = (optionData.extra)?
					await this.getExtra(optionVal, optionData.extra) : '';
			}
			resolve(options);
		});
	}

	static load(){
		return browser.storage.local.get(Options.getDefaults());
	}

	static save(options){
		browser.storage.local.set(options);
	}

	getExtra(optionVal, extra){
		switch(extra){
			case 'get-available-dms':
				return this.availableDMs;
		}
	}


	static getDefaults(){
		let defaultOptions = {};
		for(let optionName of Object.keys(Options.optionsData)){
			defaultOptions[optionName] = Options.optionsData[optionName].default;
		}
		return defaultOptions;
	}
	


}

Options.optionsData= {

	dlListSize: {
		type: 'textbox',
		default: '20',
		desc: 'Number of items to keep in downloads history:',
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
	},
	includedExts: {
		type: 'textbox',
		default: '',
		desc: "Detect files with these extensions as downloads:",
		process: 'get-exts-from-list',
	},
	forcedExts: {
		type: 'textbox',
		default: '',
		desc: "Directly download files with these extensions with my default manager:",
		process: 'get-exts-from-list',
	},
	blacklistDomains: {
		type: 'textbox',
		default: '',
		desc: "Do not grab from these domains:",
		process: 'get-vals-from-list',
	},
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
	defaultDM: {
		type: 'dropdown',
		default: '',
		desc: "Default download manager: ",
		extra: 'get-available-dms',
	},

}