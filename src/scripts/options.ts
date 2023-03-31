namespace Options
{
	//how to add a new option
	//add it here first
	//then to the OptionsUI class
	//the order in which options will be shown in the options page is the below order
	export class GBOptions
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
		blacklistURLs: string[] = [];
		ytdlProxy: string = '';
		defaultDM: string = '';
	}

	export type OptionNames<T> = 
	{
		[Property in keyof GBOptions]: T;
	}

	export type OptionUI<T, V> =
	{
		type: 'textbox' | 'checkbox' | 'dropdown' | 'deferred';
		desc: string;
		endsection?: boolean;
		attrs?: pair[];
		getVal: (arg?: any) => T;
		setVal: (e: V) => void;
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

	export let opt = new GBOptions();

	export async function load(availableDMs: string[] | undefined): Promise<GBOptions>
	{
		let defaults = new GBOptions();
		opt = await browser.storage.local.get(defaults);
		//todo: can we do something about this disgusting mess?
		if(!opt.defaultDM && availableDMs && availableDMs.length)
		{
			opt.defaultDM = availableDMs[0];
		}
		return opt;
	}

	export function save(options?: GBOptions): Promise<undefined|string>
	{
		if(options) opt = options;
		return browser.storage.local.set(opt);
	}

	export class OptionsUI implements OptionNames<unknown>
	{
		[index: string]: unknown;

		opt = new GBOptions();

		constructor(opt: GBOptions)
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
			getVal: () => {return this.opt.overrideDlDialog},
			setVal: (e) => {this.opt.overrideDlDialog = e.checked},
		};
		playMediaInBrowser: CheckboxOption = {
			type: 'checkbox',
			desc: "Do not offer to download files that can be displayed inside browser (text, media and pdf)",
			getVal: () => {return this.opt.playMediaInBrowser},
			setVal: (e) => {this.opt.playMediaInBrowser = e.checked},
		};
		dlListSize: TextboxOption = {
			type: 'textbox',
			desc: 'Number of items to keep in downloads history:',
			getVal: () => {return this.opt.dlListSize.toString()},
			setVal: (e) => {this.opt.dlListSize = Number(e.value)},
		};
		showOnlyTabDls: CheckboxOption = {
			type: 'checkbox',
			desc: 'Show only downlods originated from current tab in the popup list',
			endsection: true,
			getVal: () => {return this.opt.showOnlyTabDls},
			setVal: (e) => {this.opt.showOnlyTabDls = e.checked},
		};
	
		grabFilesLargerThanMB: TextboxOption = {
			type: 'textbox',
			desc: "Ignore files smaller than (MB):",
			getVal: () => {return this.opt.grabFilesLargerThanMB.toString()},
			setVal: (e) => {this.opt.grabFilesLargerThanMB = Number(e.value)},
		};
		excludeWebFiles: CheckboxOption = {
			type: 'checkbox',
			desc: "Ignore common web files (images, fonts, etc.)",
			getVal: () => {return this.opt.excludeWebFiles},
			setVal: (e) => {this.opt.excludeWebFiles = e.checked},
		};
		excludedExts: TextboxOption = {
			type: 'textbox',
			desc: "Ignore files with these extensions:",
			attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
			getVal: () => {return this.opt.excludedExts.join(', ')},
			setVal: (e) => {this.opt.excludedExts = this.getExtsFromList(e.value)},
		};
		includedExts: TextboxOption = {
			type: 'textbox',
			desc: "Detect files with these extensions as downloads:",
			attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
			getVal: () => {return this.opt.includedExts.join(', ')},
			setVal: (e) => {this.opt.includedExts = this.getExtsFromList(e.value)},
		};
		forcedExts: TextboxOption = {
			type: 'textbox',
			desc: "Directly download files with these extensions with my default manager:",
			attrs: [{name: 'placeholder', value: 'ext1,ext2,ext3,...'}],
			getVal: () => {return this.opt.forcedExts.join(', ')},
			setVal: (e) => {this.opt.forcedExts = this.getExtsFromList(e.value)},
		};
		blacklistDomains: TextboxOption = {
			type: 'textbox',
			desc: "Do not grab from these domains:",
			attrs: [{name: 'placeholder', value: 'example.com,example.org,...'}],
			endsection: true,
			getVal: () => {return this.opt.blacklistDomains.join(', ')},
			setVal: (e) => {this.opt.blacklistDomains = this.getValuesFromList(e.value)},
		};

		ytdlProxy: TextboxOption = {
			type: 'textbox',
			desc: 'Youtube-DL proxy address',
			endsection: true,
			getVal: () => {return this.opt.ytdlProxy},
			setVal: (e) => {this.opt.ytdlProxy = e.value}
		};
	
		defaultDM: DropdownOption = {
			type: 'dropdown',
			desc: "Default download manager: ",
			getVal: (GBPop: GrabbyPopup) =>
			{
				let availableDMs = GBPop.availableDMs;

				if(typeof availableDMs === 'undefined' || availableDMs.length == 0)
				{
					return {
						selected: '',
						list: []
					}
				}

				return {
					selected: this.opt.defaultDM,
					list: availableDMs,
				}
			},
			setVal: (e) => {this.opt.defaultDM = (e.value)? e.value : ''}
		};

		excludedMimes: DeferredOption = {
			type: 'deferred',
			desc: '',
			getVal: () => {},
			setVal: () => {this.opt.excludedMimes = this.getMimesForExts(this.opt.excludedExts)}
		};
		includedMimes: DeferredOption = {
			type: 'deferred',
			desc: '',
			getVal: () => {},
			setVal: () => {this.opt.includedMimes = this.getMimesForExts(this.opt.includedExts)}
		};
		forcedMimes: DeferredOption = {
			type: 'deferred',
			desc: '',
			getVal: () => {},
			setVal: () => {this.opt.forcedMimes = this.getMimesForExts(this.opt.forcedExts)}
		};
		//this only gets set at runtime when someone blacklists a download
		blacklistURLs: DeferredOption = {
			type: 'deferred',
			desc: '',
			getVal: () => {},
			setVal: () => {},
		};
		
	}

}