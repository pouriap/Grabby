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
				return DLG.availableDMs;
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

	static applyOptions(options)
	{
		//create a new list of downloads in case the downloas history size is changed in options
		DLG.allDownloads = new FixedSizeMap(options.dlListSize, this.allDownloads.list);
		//exclusion,inclusion,download lists
		DLG.options.excludedExts = _getExtsFromList(options.excludedExts);
		DLG.options.excludedMimes = _getMimesForExts(this.options.excludedExts);
		DLG.options.includedExts = _getExtsFromList(options.includedExts);
		DLG.options.includedMimes = _getMimesForExts(this.options.includedExts);
		DLG.options.forcedExts = _getExtsFromList(options.forcedExts);
		DLG.options.forcedMimes = _getMimesForExts(this.options.forcedExts);
		DLG.options.blacklistDomains = _getValuesFromList(this.options.blacklistDomains);

		function _getExtsFromList(extList){
			if(!extList){
				return [];
			}
			let extsArr = [];
			//remove spaces
			extList = extList.replace(/\s/g, '');
			for(let ext of extList.split(',')){
				//remove dot in case people have put dots in ext list
				if(ext.startsWith('.')){
					ext = ext.substr(1);
				}
				extsArr.push(ext);
			}
			return extsArr;
		}

		function _getMimesForExts(extsArr){
			if(!extsArr){
				return [];
			}
			let mimesArr = [];
			for(let ext of extsArr){
				let mimesOfExt = constants.extsToMimes[ext];
				if(mimesOfExt){
					mimesArr = mimesArr.concat(mimesOfExt);
				}
			}
			return mimesArr;
		}

		function _getValuesFromList(list){
			if(!list){return [];}
			//remove spaces
			list = list.replace(/\s/g, '');
			return list.split(',');
		}
	}

	static getDefaultDM(){
		return DLG.options.defaultDM || DLG.availableDMs[0];
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