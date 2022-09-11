interface PopupView
{
	render(): void;
}

interface DLGWindow
{
	display(): Promise<webx_window>;
}

class DownloadWindow implements DLGWindow
{
	download: Download;

	constructor(download: Download)
	{
		this.download = download;
	}

	/**
	 * Displays the download override window
	 * we put the download hash into the URL of the window
	 * when the window is created we retreive this hash and get the corresponding download from DLGpop
	 * when the dialog is closed it sends a message to the background script telling it whether to continue or block the request
	 */
	display()
	{
		let screenW = window.screen.width;
		let screenH = window.screen.height;
		let windowW = 480;
		let windowH = 350;
		let leftMargin = (screenW/2) - (windowW/2);
		let topMargin = (screenH/2) - (windowH/2);

		let createData = {
			type: "detached_panel",
			titlePreface: this.download.filename,
			//add the hash of the download to the URL of this window
			//when the window is loaded our code will use the hash to get the download from DLGPop
			url: "popup/download.html?dlHash=" + this.download.hash,
			allowScriptsToClose : true,
			width: windowW,
			height: windowH,
			left: leftMargin,
			top: topMargin
		};
		return browser.windows.create(createData);
	}
}