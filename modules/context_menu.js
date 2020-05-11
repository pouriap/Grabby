var DG = DG || {};

DG.ContextMenu = {

	menuParentId : 'download.grab.menu.parent',
	menuGrabAllId : 'download.grab.menu.graball',
	menuGrabSelectionId : 'download.grab.menu.grabselection',

	/**
	 * 	
	 * @param {DlGrabApp} app 
	 */
	initialize: function(app){

		this.app = app;

		//add parent menu item
		browser.menus.create({
			id: this.menuParentId,
			title: "Download Grab", 
			contexts: ["all"],
		});

		//add grab all menu
		browser.menus.create({
			id: this.menuGrabAllId,
			title: "Grab All",
			contexts: ["all"],
			parentId: this.menuParentId
		});

		//add grab selection menu
		browser.menus.create({
			id: this.menuGrabSelectionId,
			title: "Grab Selection",
			contexts: ["selection"],
			parentId: this.menuParentId
		});

		//menu click listener
		browser.menus.onClicked.addListener(this.doOnMenuClicked);
	},

	/**
	 * Runs every time a menu item is clicked
	 * Links in selection are extracted using code by: https://github.com/c-yan/open-selected-links
	 */
	doOnMenuClicked : async function(info, tab){

		let _this = DG.ContextMenu;

		let defaultDM = _this.app.options.defaultDM || _this.app.runtime.availableDMs[0];

		if(!defaultDM){
			//todo: show notification?
			console.log('no download managers are available');
			return;
		}

		if(info.menuItemId == _this.menuGrabAllId){
			let result = await browser.tabs.executeScript({file: 'scripts/get_all_links.js'});
			downloadLinks(result[0]);
		}
		else if(info.menuItemId == _this.menuGrabSelectionId){
			let result = await browser.tabs.executeScript({file: 'scripts/get_selection_links.js'});
			downloadLinks(result[0]);
		}

		function downloadLinks(result){
			let links = result.links;
			let originPageUrl = result.originPageUrl;
			let originPageDomain = result.originPageDomain;
			let originPageReferer = result.originPageReferer;
			DG.NativeUtils.downloadMultiple(
				defaultDM,
				links,
				originPageUrl,
				originPageReferer,
				originPageDomain
			);
		}
	}

}