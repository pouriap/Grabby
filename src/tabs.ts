namespace Tabs
{
	export async function startListeners()
	{
		let info = await browser.runtime.getBrowserInfo();
		let version = info.version.split('.')[0];

		browser.tabs.onCreated.addListener((tab: any) => {
			DLG.tabs.set(tab.id, tab);
		});

		//'url' is only supported in FF88+
		let props = (version < 88)? ["status", "title"] :  ["status", "title", "url"];
		browser.tabs.onUpdated.addListener((tabId:number, changeInfo: any, tab: any) => {
			DLG.tabs.set(tabId, tab);
		}, {
			properties: props
		});

		browser.tabs.onRemoved.addListener((tabId: number) => {
			DLG.tabs.delete(tabId);
		})
	}
}