class ContextMenu {

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
		browser.menus.onClicked.addListener((info, tab) => {
			return ContextMenu.doOnMenuClicked(info, tab, OptionUtils.getDefaultDM());
		});
	}

	/**
	 * Runs every time a menu item is clicked
	 * Links in selection are extracted using code by: https://github.com/c-yan/open-selected-links
	 */
	static async doOnMenuClicked(info, tab, defaultDM){

		console.log('menu clicked: ', info, '\ntab: ', tab);

		if(!defaultDM){
			console.log('no download managers are available');
			let options = {
				type: "basic", 
				title: "Download Grab", 
				message: "ERROR: No download managers found on the system"
			};
			browser.notifications.create(options);
			return;
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
		else if(info.menuItemId == ContextMenu.MENU_ID_GRAB_LINK){
			let result = {};
			result.links = [{href: info.linkUrl, description: info.linkText}];
			if(tab){
				result.originPageUrl = info.pageUrl;
				result.originPageReferer = await Utils.executeScript(tab.id, {code: 'document.referrer'});
			}
			downloadLinks(result);
		}

		function downloadLinks(result){
			DownloadJob.getFromLinks(
				defaultDM, 
				result.links, 
				result.originPageUrl, 
				result.originPageReferer
			).then((job)=>{
				Utils.performJob(job);
			});
		}

	}

}

ContextMenu.MENU_ID_PARENT = 'download.grab.menu.parent';
ContextMenu.MENU_ID_GRAB_ALL = 'download.grab.menu.graball';
ContextMenu.MENU_ID_GRAB_SELECTION = 'download.grab.menu.grabselection';
ContextMenu.MENU_ID_GRAB_LINK = 'download.grab.menu.grablink';

ContextMenu.SCRIPT_GET_ALL = '../content_scripts/get_all_links.js';
ContextMenu.SCRIPT_GET_SELECTION = '../content_scripts/get_selection_links.js';
