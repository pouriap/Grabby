namespace Notifs
{
	export const ID_TOOLKIT_PAGE = 'toolkit-not-found';

	export function startListeners()
	{
		browser.notifications.onClicked.addListener(onNotifClicked);
	}

	export function create(title: string, msg: string, id?: string)
	{
		let options: any = 
		{
			type: "basic", 
			title: title, 
			iconUrl: "icons/icon128.png",
			message: msg,
		};

		browser.notifications.create(id, options);
	}

	function onNotifClicked(id: string)
	{
		if(id === ID_TOOLKIT_PAGE)
		{
			handleKitNotFound();
		}
	}

	function handleKitNotFound()
	{
		browser.tabs.create({"url":"https://github.com/pouriap/Grabby-Toolkit/releases/latest"});
	}
}