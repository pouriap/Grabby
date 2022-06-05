class Options 
{
	/**
	 * Loads options from browser storage
	 * @returns {Promise}
	 */
	static load(){
		return browser.storage.local.get(Options.getDefaults());
	}

	/**
	 * Saves options to browser storage
	 * @param {object} options 
	 */
	static save(options){
		browser.storage.local.set(options);
	}

	static getDefaults(){
		let defaultOptions = {};
		for(let optionName in Options.optionsData){
			defaultOptions[optionName] = Options.optionsData[optionName].default;
		}
		return defaultOptions;
	}

	static apply(options)
	{
		DLG.options = options;
		//create a new list of downloads in case the downloas history size is changed in options
		DLG.allDownloads = new FixedSizeMap(options.dlListSize, DLG.allDownloads.list);
		//exclusion,inclusion,download lists
		DLG.options.excludedExts = _getExtsFromList(options.excludedExts);
		DLG.options.excludedMimes = _getMimesForExts(DLG.options.excludedExts);
		DLG.options.includedExts = _getExtsFromList(options.includedExts);
		DLG.options.includedMimes = _getMimesForExts(DLG.options.includedExts);
		DLG.options.forcedExts = _getExtsFromList(options.forcedExts);
		DLG.options.forcedMimes = _getMimesForExts(DLG.options.forcedExts);
		DLG.options.blacklistDomains = _getValuesFromList(DLG.options.blacklistDomains);

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

Options.optionsData = 
{
	
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
	},
	showOnlyTabDls: {
		type: 'checkbox',
		default: true,
		desc: 'Show only downlods originated from current tab in the popup list',
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
		attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
	},
	includedExts: {
		type: 'textbox',
		default: '',
		desc: "Detect files with these extensions as downloads:",
		attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
	},
	forcedExts: {
		type: 'textbox',
		default: '',
		desc: "Directly download files with these extensions with my default manager:",
		attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
	},
	blacklistDomains: {
		type: 'textbox',
		default: '',
		desc: "Do not grab from these domains:",
		attrs: [{name: 'placeholder', value: 'example.com,example.org,...'}],
		endsection: true,
	},

	defaultDM: {
		type: 'dropdown',
		default: '',
		desc: "Default download manager: ",
		getListData: function(dlgInstance){
			return dlgInstance.availableDMs;
		},
	},

}