namespace PopupMenu
{
	var currTab: tabinfo;

	document.addEventListener("DOMContentLoaded", (e) => {

		ui.getAll(".action").forEach((e) => {
			e.addEventListener('click', () => {
				actionClicked(e);
			});
		});
	
		//download progress is sent to background via the native app, and then 
		//sent here using messaging
		browser.runtime.onMessage.addListener((msg: Messaging.MSGYTDLProg) => { 
			if(msg.type === Messaging.TYP_YTDL_PROGRESS)
			{
				let percent = msg.percent;
				let dlHash = msg.dlHash;
				let el = ui.get(`#downloads-list li[data-hash="${dlHash}"]`)!;
	
				//remove the progress bar when download is complete
				if(percent == '100')
				{
					el.removeAttribute('style');
				}
				else{
					el.style.background = `linear-gradient(to right, #8c8fb1 ${percent}%, #fff 0%)`;
				}
			}
		});
	
		ui.get("#dl-with-dlgrab")?.click();
	
		Popup.getBackgroundData().then(getCurrentTab).then(renderDownloadsList);
	
	});

	async function getCurrentTab(): Promise<void>
	{
		let tab = (await browser.tabs.query({currentWindow: true, active: true}))[0];
		currTab = DLGPop.tabs.getsure(tab.id);
	}

	/**
	 * This is called every time something with '.action' class is clicked in a popup dialog
	 */
	function actionClicked(clickedAction: Element)
	{
		let id = clickedAction.id;
		let disabled = clickedAction.getAttribute("class")?.indexOf("disabled-action") !== -1;
		let selectedDl = Popup.selectedDl;
	
		if(disabled){
			return;
		}
		
		switch(id)
		{
			case "action-download":
				if( (ui.get("#dl-with-dlgrab") as HTMLInputElement).checked){
					Popup.downloadWithSelectedDM(selectedDl);
				}
				else{
					Popup.downloadWithFirefox(selectedDl);
				}
				break;

			case "action-ytdl-manifest":
				ytdlManifest(selectedDl, Number(clickedAction.getAttribute('data-format-id')));
				break;
	
			case "action-ytdl-video":
				ytdlVideo();
				break;
	
			case "action-ytdl-audio":
				ytdlAudio();
				break;
	
			case "action-back":
				renderDownloadsList();
				break;
	
			case "action-clearList":
				clearDownloadsList();
				break;
	
			case "dl-with-dlgrab":
				ui.get("#dm-list-container")?.classList.remove("disabled");
				break;
	
			case "dl-with-firefox":
				ui.get("#dm-list-container")?.classList.add("disabled");
				break;			
	
			default:
				break;
		}
	}

	function ytdlManifest(download: Download, formatId: number)
	{
		let manifest = download.manifest!;
		for(let format of manifest.formats)
		{
			if(format.id === formatId)
			{
				let url = format.url;
				let msg = new Messaging.MSGYTDLManifest(url, download.hash, formatId.toString());
				Messaging.sendMessage(msg);
				return;
			}
		}

		log.err(`format with id ${formatId} not found`);
	}

	function ytdlVideo()
	{

	}

	function ytdlAudio()
	{

	}
	
	/**
	 * shows the list of all download items
	 */
	function renderDownloadsList()
	{
		ui.hide('.unique-display');
	
		//this is called two different times
		//1- when we click the popup button
		//2- when we click back from a download details panel
		//when we click back the downloads are already there and only hidden
		//so we don't have to repopulate them in this case
	
		if(ui.get('#popup-downloads')!.getAttribute('populated')){
			ui.show('#popup-downloads');
			return;
		}
	
		//populate list of downloads
		let keys = Array.from(DLGPop.allDownloads.keys());
		//reverse to show latest downloads on top
		keys.reverse();
		
		for(const key of keys)
		{
			let download = DLGPop.allDownloads.get(key)!;
	
			if(download.hidden){
				continue;
			}
	
			if(DLGPop.options.showOnlyTabDls && download.ownerTabId != currTab.id){
				continue;
			}
	
			let listItem = ui.create('li', {
				'id': "req_" + download.requestId,
				'class': "dl-item ",
				'title': download.url,
				'data-hash': key
			});
			let reason = (log.DEBUG)? " (" + download.classReason + ")" : "";
	
			listItem.innerHTML = download.filename + reason;

			listItem.addEventListener("click", function(evt)
			{
				//todo: when you click a download and make some changes and then click another download 
				// the same changes are still there because it's the same page
				ui.get('#action-report')!.setAttribute('class', 'action');
				ui.get('#action-report')!.innerHTML = 'Report falsely detected download';
	
				let hash = this.getAttribute("data-hash")!;
				Popup.selectedDl = DLGPop.allDownloads.get(hash)!;

				log.d('item clicked: ', Popup.selectedDl);
	
				if(Popup.selectedDl.isStream){
					renderStream(StreamDataUI.getFromManifest(Popup.selectedDl.manifest!));
				}
				else if(typeof Popup.selectedDl.specialHandler != 'undefined'){
					renderSpecial();
				}
				else{
					renderDownload(Popup.selectedDl);
				}
			});
	
			//todo: remove this
			//this is for getting the info we put in tests
			if(log.DEBUG)
			{
				listItem.addEventListener("contextmenu", function(evt){
					evt.preventDefault();
					let hash = this.getAttribute("data-hash")!;
					let dl = DLGPop.allDownloads.get(hash)!;
					let info = {
						httpDetails: dl.httpDetails,
					};
					log.d(JSON.stringify(info).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
				});
			}
	
			ui.get("#downloads-list")!.appendChild(listItem);
		}
	
		ui.get('#popup-downloads')!.setAttribute('populated', 'populated');
		ui.show('#popup-downloads');
	}
	
	/**
	 * Shows the details popup for a particular download item
	 */
	function renderDownload(download: Download)
	{
		ui.hide('.unique-display');
	
		ui.get("#download-details #filename")!.innerHTML = download.filename;
		ui.get("#download-details #filename")!.setAttribute("title", download.filename);
		ui.get("#download-details #size")!.innerHTML = 
			(download.size !== -1)? filesize(download.size) : download.size;
		ui.get("#download-details #url")!.innerHTML = download.url;
		ui.get("#download-details #url")!.setAttribute("title", download.url);
	
		Popup.populateDMs();
	
		ui.show('#download-details');
	}
	
	/**
	 * Shows the details popup for a particular stream download
	 */
	function renderStream(data: StreamDataUI)
	{
		ui.hide('.unique-display');
		
		ui.get("#stream-details #formats-list")!.innerHTML = "";
	
		let duration = Utils.formatSeconds(data.duration);
		ui.get("#stream-details #filename")!.innerHTML = data.title;
		ui.get("#stream-details #filename")!.setAttribute("title", data.title);
		ui.get("#stream-details #duration")!.innerHTML = duration;
		ui.get("#stream-details #duration")!.setAttribute("title", duration);
	
		//sort
		data.formats.sort((a, b)=>{
			return a.pictureSize - b.pictureSize;
		});
	
		for(let format of data.formats)
		{
			let li = document.createElement('li');
			li.setAttribute('class', 'format action');
			li.setAttribute('id', 'action-ytdl-video');
			li.setAttribute('data-format-id', format.id.toString());
			document.querySelector("#stream-details #formats-list")!.appendChild(li);
	
			let name = format.nickName;
			let res = format.res;
			let size = filesize(format.fileSize, {round: 0});
	
			li.innerHTML = `${name} [ ${res}px / ~${size} ]`;
		}
	
		//add the listeners for the newly added elements
		document.querySelectorAll("#stream-details .action").forEach(function(action){
			action.addEventListener('click', (evt)=>{
				actionClicked(action);
			});
		});
	
		ui.show('#stream-details');
	}
	
	/**
	 * clears list of all download items
	 */
	function clearDownloadsList()
	{
		ui.get("#downloads-list")!.innerHTML = '<li id="no-dl" style="display:none;">No Downloads</li>';
		let msg = new Messaging.MSGClearlist();
		Messaging.sendMessage(msg);
	}
	
	/**
	 * Shows a special popup for each special site
	 */
	function renderSpecial()
	{
		switch(Popup.selectedDl.specialHandler)
		{
			case 'youtube-video':
				renderYtVideo();
				break;
			default:
				break;
		}
	}
	
	function renderYtVideo()
	{
		renderStream(StreamDataUI.getFromYTDLInfo(Popup.selectedDl.ytdlinfo!));
	}
}