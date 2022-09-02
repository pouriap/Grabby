namespace Tabs
{
	export async function startListeners()
	{
		let info = await browser.runtime.getBrowserInfo();
		let version = info.version.split('.')[0];

		browser.tabs.onCreated.addListener((tab: webx_tab) => {
			DLG.tabs.set(tab.id, new tabinfo(tab));
		});

		//'url' is only supported in FF88+
		let props = (version < 88)? ["status", "title"] :  ["status", "title", "url"];
		browser.tabs.onUpdated.addListener((tabId:number, changeInfo: any, tab: webx_tab) => {
			DLG.tabs.set(tabId, new tabinfo(tab));
		}, {
			properties: props
		});

		browser.tabs.onRemoved.addListener((tabId: number) => {
			let tab = DLG.tabs.get(tabId);
			if(!tab){
				log.err(`tab with id ${tabId} does not exist`);
			}
			tab.closed = true;
		});
	}
}