//todo: turn this to namespace
//todo: turn everything that only has listeners to namespace

type context_link = 
{
	href: string,
	desc: string
};

type context_result = 
{
	links: context_link[],
	originPageUrl: string,
	originPageReferer: string
};

class ContextMenu
{
	static readonly MENU_ID_PARENT = 'download.grab.menu.parent';
	static readonly MENU_ID_GRAB_ALL = 'download.grab.menu.graball';
	static readonly MENU_ID_GRAB_SELECTION = 'download.grab.menu.grabselection';
	static readonly MENU_ID_GRAB_LINK = 'download.grab.menu.grablink';
	static readonly SCRIPT_GET_ALL = '../content_scripts/get_all_links.js';
	static readonly SCRIPT_GET_SELECTION = '../content_scripts/get_selection_links.js';

	static init(){

		//add grab all menu
		browser.menus.create({
			id: ContextMenu.MENU_ID_GRAB_ALL,
			title: "Grab All",
			contexts: ["page"],
		});

		//add grab selection menu
		browser.menus.create({
			id: ContextMenu.MENU_ID_GRAB_SELECTION,
			title: "Grab Selection",
			contexts: ["selection"],
		});

		//add grab link mneu
		browser.menus.create({
			id: ContextMenu.MENU_ID_GRAB_LINK,
			title: "Grab Link",
			contexts: ["link"],
		});

		//menu click listener
		browser.menus.onClicked.addListener((info: any, tab: any) => {
			return ContextMenu.doOnMenuClicked(info, tab, Options.getDefaultDM());
		});
	}

	/**
	 * Runs every time a menu item is clicked
	 * Links in selection are extracted using code by: https://github.com/c-yan/open-selected-links
	 */
	static async doOnMenuClicked(info: any, tab: any, defaultDM: string)
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

		if(info.menuItemId == ContextMenu.MENU_ID_GRAB_ALL){
			//if tab is undefined it means we are in forbidden urls where we can't inject scripts
			if(!tab){
				return;
			}
			let res = await Utils.executeScript(tab.id, {file: ContextMenu.SCRIPT_GET_ALL});
			downloadLinks(res);
		}
		else if(info.menuItemId == ContextMenu.MENU_ID_GRAB_SELECTION){
			//if tab is undefined it means we are in forbidden urls where we can't inject scripts
			if(!tab){
				return;
			}
			let res = await Utils.executeScript(tab.id, {file: ContextMenu.SCRIPT_GET_SELECTION});
			downloadLinks(res);
		}
		else if(info.menuItemId == ContextMenu.MENU_ID_GRAB_LINK)
		{
			let result: context_result = 
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

		function downloadLinks(result: context_result)
		{
			DownloadJob.getFromContext(defaultDM, result).then((job)=>{
				DLG.doDownloadJob(job);
			});
		}

	}

}
