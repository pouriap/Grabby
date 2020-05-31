var DG = DG || {};

DG.Options = {

	/**
	 * 
	 * @param {DlGrabApp} app 
	 */
	initialize: function(availableDMs){
		this.availableDMs = availableDMs;
	},

	loadWithData: function(){
		return new Promise(async function(resolve){
			let options = await browser.storage.local.get(DG.Options.utils.getDefaults());
			for(let optName of Object.keys(options)){
				let optionValue = options[optName];
				let optionData = DG.Options.optionsData[optName];
				options[optName] = {};
				options[optName].name = optName;
				options[optName].type = optionData.type;
				options[optName].desc = optionData.desc;
				options[optName].value = optionValue;
				options[optName].extra = (optionData.extra)?
					await optionData.extra(optionValue) : '';
				options[optName].processedValue = (optionData.process)?
					await optionData.process(optionValue) : optionValue;
			}
			resolve(options);
		});
	},

	loadProcessed: function(){
		return new Promise(async function(resolve){
			let options = await browser.storage.local.get(DG.Options.utils.getDefaults());
			for(let optName of Object.keys(options)){
				let optionValue = options[optName];
				let optionData = DG.Options.optionsData[optName];
				options[optName] = (optionData.process)?
					await optionData.process(optionValue) : optionValue;
			}
			resolve(options);
		});	
	},

	save: function(options){
		browser.storage.local.set(options);
	},

	utils: {
		getDefaults(){
			let defaultOptions = {};
			for(let optionName of Object.keys(DG.Options.optionsData)){
				defaultOptions[optionName] = DG.Options.optionsData[optionName].default;
			}
			return defaultOptions;
		},
		getExtsFromList: function(extList){
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
		},
		getValuesFromList: function(list){
			if(!list){return [];}
			//remove spaces
			list = list.replace(/\s/g, '');
			return list.split(',');
		}
	},

	optionsData: {
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
			process: (v)=>{return DG.Options.utils.getExtsFromList(v)},
		},
		includedExts: {
			type: 'textbox',
			default: '',
			desc: "Detect files with these extensions as downloads:",
			process: (v)=>{return DG.Options.utils.getExtsFromList(v)},
		},
		forcedExts: {
			type: 'textbox',
			default: '',
			desc: "Directly download files with these extensions with my default manager:",
			process: (v) => {return DG.Options.utils.getExtsFromList(v)},
		},
		blacklistDomains: {
			type: 'textbox',
			default: '',
			desc: "Do not grab from these domains:",
			process: (v) => {return DG.Options.utils.getValuesFromList(v)},
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
			extra: (v) => {return DG.Options.availableDMs},
		},
	}

}