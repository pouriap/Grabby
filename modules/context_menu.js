var DG = DG || {};

DG.ContextMenu = {

	MENU_ID_PARENT : 'download.grab.menu.parent',
	MENU_ID_GRAB_ALL : 'download.grab.menu.graball',
	MENU_ID_GRAB_SELECTION : 'download.grab.menu.grabselection',
	MENU_ID_GRAB_LINK: 'download.grab.menu.grablink',

	SCRIPT_GET_ALL: '../scripts/get_all_links.js',
	SCRIPT_GET_SELECTION: '../scripts/get_selection_links.js',

	/**
	 * 	
	 * @param {DlGrabApp} app 
	 */
	initialize: function(app){

		this.app = app;

		//add parent menu item
		// browser.menus.create({
		// 	id: this.MENU_ID_PARENT,
		// 	title: "Download Grab", 
		// 	contexts: ["all"],
		// });

		//add grab all menu
		browser.menus.create({
			id: this.MENU_ID_GRAB_ALL,
			title: "Grab All",
			contexts: ["page"],
			//parentId: this.MENU_ID_PARENT
		});

		//add grab selection menu
		browser.menus.create({
			id: this.MENU_ID_GRAB_SELECTION,
			title: "Grab Selection",
			contexts: ["selection"],
			//parentId: this.MENU_ID_PARENT
		});

		//add grab link mneu
		browser.menus.create({
			id: this.MENU_ID_GRAB_LINK,
			title: "Grab Link",
			contexts: ["link"],
			//parentId: this.MENU_ID_PARENT
		});

		//menu click listener
		browser.menus.onClicked.addListener(this.doOnMenuClicked);
	},

	/**
	 * Runs every time a menu item is clicked
	 * Links in selection are extracted using code by: https://github.com/c-yan/open-selected-links
	 */
	doOnMenuClicked : async function(info, tab){

		console.log('menu clicked: ', info, '\ntab: ', tab);

		let _this = DG.ContextMenu;

		let defaultDM = _this.app.options.defaultDM || _this.app.runtime.availableDMs[0];

		if(!defaultDM){
			console.log('no download managers are available');
			let options = {
				type: "basic", 
				title: "Download Grab", 
				message: "ERROR: ERROR: No download managers found on the system"
			};
			browser.notifications.create(options);
			return;
		}

		if(info.menuItemId == _this.MENU_ID_GRAB_ALL){
			//if tab is undefined it means we are in forbidden urls where we can't inject scripts
			if(!tab){
				return;
			}
			let result = await browser.tabs.executeScript(tab.id, {file: _this.SCRIPT_GET_ALL});
			downloadLinks(result[0]);
		}
		else if(info.menuItemId == _this.MENU_ID_GRAB_SELECTION){
			//if tab is undefined it means we are in forbidden urls where we can't inject scripts
			if(!tab){
				return;
			}
			let result = await browser.tabs.executeScript(tab.id, {file: _this.SCRIPT_GET_SELECTION});
			downloadLinks(result[0]);
		}
		else if(info.menuItemId == _this.MENU_ID_GRAB_LINK){
			let result = {};
			result.links = [{href: info.linkUrl, description: info.linkText}];
			if(tab){
				result.originPageUrl = info.pageUrl;
				result.originPageReferer = await browser.tabs.executeScript(tab.id, {code: 'document.referrer'});
			}
			downloadLinks(result);
		}

		function downloadLinks(result){
			let links = result.links;
			let originPageUrl = result.originPageUrl;
			let originPageReferer = result.originPageReferer;
			DG.NativeUtils.downloadMultiple(
				defaultDM,
				links,
				originPageUrl,
				originPageReferer,
			);
		}
	}

}