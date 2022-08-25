namespace Options
{
	export class DLGOptions
	{
		[index: string]: unknown;
		overrideDlDialog: boolean = true;
		playMediaInBrowser: boolean = true;
		dlListSize: number = 20;
		showOnlyTabDls: boolean = true;
		grabFilesLargerThanMB: number = 5;
		excludeWebFiles: boolean = true;
		includedExts: string[] = [];
		includedMimes: string[] = [];
		excludedExts: string[] = [];
		excludedMimes: string[] = [];
		forcedExts: string[] = [];
		forcedMimes: string[] = [];
		blacklistDomains: string[] = [];
		defaultDM: string = '';
	}

	export type OptionNames<T> = 
	{
		[Property in keyof DLGOptions]: T;
	}

	export type OptionUI<T, V> =
	{
		type: 'textbox' | 'checkbox' | 'dropdown' | 'deferred';
		desc: string;
		endsection?: boolean;
		attrs?: pair[];
		load: () => T;
		save: (e: V) => void;
	}

	export type CheckboxOption = OptionUI<boolean, HTMLInputElement> &
	{
		type: 'checkbox';
	}

	export type TextboxOption = OptionUI<string, HTMLInputElement> & 
	{
		type: 'textbox';
	}

	export type DropdownOption = OptionUI<{selected: string, list: string[]}, HTMLOptionElement> & 
	{
		type: 'dropdown';
	}

	export type DeferredOption = OptionUI<void, undefined> &
	{
		type: 'deferred';
	}

	export function isCheckbox(obj: any): obj is CheckboxOption {
		return obj.type === 'checkbox';
	}

	export function isTextbox(obj: any): obj is TextboxOption {
		return obj.type === 'textbox';
	}

	export function isDropdown(obj: any): obj is DropdownOption {
		return obj.type === 'dropdown';
	}

	export function isDeferred(obj: any): obj is DeferredOption {
		return obj.type === 'deferred';
	}

	export let opt = new DLGOptions();

	export function load()
	{
		let defaults = new DLGOptions();
		opt = browser.storage.local.get(defaults);
	}

	export function save(options: DLGOptions): Promise<undefined|string>
	{
		return browser.storage.local.set(options);
	}

	export class OptionsUI implements OptionNames<unknown>
	{
		[index: string]: unknown;

		opt = new DLGOptions();

		constructor(opt: DLGOptions)
		{
			this.opt = opt;
		}

		private getExtsFromList(extList: string)
		{
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
	
		private getMimesForExts(extsArr: string[])
		{
			let mimesArr: string[] = [];
			for(let ext of extsArr){
				let mimesOfExt = constants.extsToMimes[ext];
				if(mimesOfExt){
					mimesArr = mimesArr.concat(mimesOfExt);
				}
			}
			return mimesArr;
		}
	
		private getValuesFromList(list: string)
		{
			//remove spaces
			list = list.replace(/\s/g, '');
			return list.split(',');
		}

		overrideDlDialog: CheckboxOption = {
			type: 'checkbox',
			desc: "Override Firefox's download dialog",
			load: () => {return this.opt.overrideDlDialog},
			save: (e) => {this.opt.overrideDlDialog = e.checked},
		};
		playMediaInBrowser: CheckboxOption = {
			type: 'checkbox',
			desc: "Do not offer to download files that can be displayed inside browser (text, media and pdf)",
			load: () => {return this.opt.playMediaInBrowser},
			save: (e) => {this.opt.playMediaInBrowser = e.checked},
		};
		dlListSize: TextboxOption = {
			type: 'textbox',
			desc: 'Number of items to keep in downloads history:',
			load: () => {return this.opt.dlListSize.toString()},
			save: (e) => {this.opt.dlListSize = Number(e.value)},
		};
		showOnlyTabDls: CheckboxOption = {
			type: 'checkbox',
			desc: 'Show only downlods originated from current tab in the popup list',
			endsection: true,
			load: () => {return this.opt.showOnlyTabDls},
			save: (e) => {this.opt.showOnlyTabDls = e.checked},
		};
	
		grabFilesLargerThanMB: TextboxOption = {
			type: 'textbox',
			desc: "Ignore files smaller than (MB):",
			load: () => {return this.opt.grabFilesLargerThanMB.toString()},
			save: (e) => {this.opt.grabFilesLargerThanMB = Number(e.value)},
		};
		excludeWebFiles: CheckboxOption = {
			type: 'checkbox',
			desc: "Ignore common web files (images, fonts, etc.)",
			load: () => {return this.opt.excludeWebFiles},
			save: (e) => {this.opt.excludeWebFiles = e.checked},
		};
		excludedExts: TextboxOption = {
			type: 'textbox',
			desc: "Ignore files with these extensions:",
			attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
			load: () => {return this.opt.excludedExts.join(', ')},
			save: (e) => {this.opt.excludedExts = this.getExtsFromList(e.value)},
		};
		includedExts: TextboxOption = {
			type: 'textbox',
			desc: "Detect files with these extensions as downloads:",
			attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
			load: () => {return this.opt.includedExts.join(', ')},
			save: (e) => {this.opt.includedExts = this.getExtsFromList(e.value)},
		};
		forcedExts: TextboxOption = {
			type: 'textbox',
			desc: "Directly download files with these extensions with my default manager:",
			attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
			load: () => {return this.opt.forcedExts.join(', ')},
			save: (e) => {this.opt.forcedExts = this.getExtsFromList(e.value)},
		};
		blacklistDomains: TextboxOption = {
			type: 'textbox',
			desc: "Do not grab from these domains:",
			attrs: [{name: 'placeholder', value: 'example.com,example.org,...'}],
			endsection: true,
			load: () => {return this.opt.blacklistDomains.join(', ')},
			save: (e) => {this.opt.blacklistDomains = this.getValuesFromList(e.value)},
		};
	
		defaultDM: DropdownOption = {
			type: 'dropdown',
			desc: "Default download manager: ",
			load: () => {
				let i: DLGBase;
				if(DLG) i = DLG;
				else if(DLGPop) i = DLGPop;
				else log.err('could not grab DLG instance to populate DM list');

				let def: string;
				if(this.opt.defaultDM) def = this.opt.defaultDM;
				else if(i.availableDMs.length) def = i.availableDMs[0];
				else def = '';

				return {
					selected: def,
					list: i.availableDMs,
				}
			},
			save: (e) => {this.opt.defaultDM = (e.value)? e.value : ''}
		};

		excludedMimes: DeferredOption = {
			type: 'deferred',
			desc: '',
			load: () => {},
			save: () => {this.opt.excludedMimes = this.getMimesForExts(this.opt.excludedExts)}
		};
		includedMimes: DeferredOption = {
			type: 'deferred',
			desc: '',
			load: () => {},
			save: () => {this.opt.includedMimes = this.getMimesForExts(this.opt.includedExts)}
		};
		forcedMimes: DeferredOption = {
			type: 'deferred',
			desc: '',
			load: () => {},
			save: () => {this.opt.forcedMimes = this.getMimesForExts(this.opt.forcedExts)}
		};
		
	}

}