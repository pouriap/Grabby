class Options {

	constructor(availableDMs){
		this.availableDMs = availableDMs;
	}

	loadForUI(){
		return new Promise(async (resolve) => {
			let options = await browser.storage.local.get(Options.getDefaults());
			for(let optName of Object.keys(options)){
				let optionVal = options[optName];
				let optionData = Options.optionsData[optName];
				options[optName] = {};
				Object.assign(options[optName], optionData);
				options[optName].name = optName;
				options[optName].value = optionVal;
				options[optName].extra = (optionData.extra)?
					await this._getExtra(optionVal, optionData.extra) : '';
			}
			resolve(options);
		});
	}

	_getExtra(optionVal, extra){
		switch(extra){
			case 'get-available-dms':
				return this.availableDMs;
		}
	}

	getDefaultDM(){

	}

	static load(){
		return browser.storage.local.get(Options.getDefaults());
	}

	static save(options){
		browser.storage.local.set(options);
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