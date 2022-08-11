namespace ContextMenu
{
	export type link = 
	{
		href: string,
		desc: string
	};
	
	export type result = 
	{
		links: ContextMenu.link[],
		originPageUrl: string,
		originPageReferer: string
	};
	
	const MENU_ID_PARENT = 'download.grab.menu.parent';
	const MENU_ID_GRAB_ALL = 'download.grab.menu.graball';
	const MENU_ID_GRAB_SELECTION = 'download.grab.menu.grabselection';
	const MENU_ID_GRAB_LINK = 'download.grab.menu.grablink';
	const SCRIPT_GET_ALL = '../content_scripts/get_all_links.js';
	const SCRIPT_GET_SELECTION = '../content_scripts/get_selection_links.js';

	export function setupListeners()
	{
		//add grab all menu
		browser.menus.create({
			id: MENU_ID_GRAB_ALL,
			title: "Grab All",
			contexts: ["page"],
		});

		//add grab selection menu
		browser.menus.create({
			id: MENU_ID_GRAB_SELECTION,
			title: "Grab Selection",
			contexts: ["selection"],
		});

		//add grab link mneu
		browser.menus.create({
			id: MENU_ID_GRAB_LINK,
			title: "Grab Link",
			contexts: ["link"],
		});

		//menu click listener
		browser.menus.onClicked.addListener((info: any, tab: any) => {
			return doOnMenuClicked(info, tab, Options.getDefaultDM());
		});
	}

	/**
	 * Runs every time a menu item is clicked
	 * Links in selection are extracted using code by: https://github.com/c-yan/open-selected-links
	 */
	async function doOnMenuClicked(info: any, tab: any, defaultDM: string)
	{
		log.d('menu clicked: ', info, '\ntab: ', tab);

		if(!defaultDM){
			let options = {
				type: "basic", 
				title: "Download Grab", 
				message: "ERROR: No download managers found on the system"
			};
			browser.notifications.create(options);
			log.err('no download managers are available');
		}

		if(info.menuItemId == MENU_ID_GRAB_ALL){
			//if tab is undefined it means we are in forbidden urls where we can't inject scripts
			if(!tab){
				return;
			}
			let res = await Utils.executeScript(tab.id, {file: SCRIPT_GET_ALL});
			downloadLinks(res);
		}
		else if(info.menuItemId == MENU_ID_GRAB_SELECTION){
			//if tab is undefined it means we are in forbidden urls where we can't inject scripts
			if(!tab){
				return;
			}
			let res = await Utils.executeScript(tab.id, {file: SCRIPT_GET_SELECTION});
			downloadLinks(res);
		}
		else if(info.menuItemId == MENU_ID_GRAB_LINK)
		{
			let result: ContextMenu.result = 
			{
				links: [{href: info.linkUrl, desc: info.linkText}],
				originPageUrl: '',
				originPageReferer: ''
			};

			if(tab){
				result.originPageUrl = info.pageUrl;
				result.originPageReferer = await Utils.executeScript(tab.id, {code: 'document.referrer'});
			}

			downloadLinks(result);
		}

		function downloadLinks(result: ContextMenu.result)
		{
			DownloadJob.getFromContext(defaultDM, result).then((job)=>{
				DLG.doDownloadJob(job);
			});
		}
	}
}