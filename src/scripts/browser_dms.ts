type BrowserDM = {
	host: string,
	isAvailable: () => Promise<boolean>,
	download: (job: DownloadJob) => void
}

class BrowserDMs
{
	static availableDMs: string[] = [];
	static polledDms = 0;

	static dms: {[index: string]: BrowserDM} = {

		'Xtreme Download Manager': {
	
			host: "http://127.0.0.1:9614",
	
			isAvailable: function(){
	
				var xdmHost = this.host;
	
				return new Promise((resolve)=>{
					let xhr = new XMLHttpRequest();
					xhr.timeout = Options.opt.socketDMTimeout;
					xhr.onreadystatechange = function () {
						if (xhr.readyState == XMLHttpRequest.DONE) {
							if (xhr.status == 200) {
								resolve(true);
							}
							else {
								resolve(false);
							}
						}
					};
					xhr.open('GET', xdmHost + "/sync", true);
					xhr.send(null);
				});
			},
	
			download: function(job: DownloadJob){
	
				var xdmHost = this.host;
	
				let data = '';
				for(let dlInfo of job.links){
					data += 'url=' + dlInfo.url + "\r\n";
					data += "res=realUA:" + navigator.userAgent + "\r\n";
					data += "cookie=" + dlInfo.cookies + "\r\n";
					data += "\r\n\r\n";
				}
	
				if(job.links.length === 1){
					var xhr = new XMLHttpRequest();
					xhr.open('POST', xdmHost + "/download", true);
					xhr.send(data);
				}
				else{
					var xhr = new XMLHttpRequest();
					xhr.open('POST', xdmHost + "/links", true);
					xhr.send(data);
				}
			
			}
	
		},
	
		'JDownloader': {
			
			host: "http://127.0.0.1:9666",
	
			isAvailable: function(){
	
				return new Promise((resolve)=>{
					let xhr = new XMLHttpRequest();
					xhr.timeout = Options.opt.socketDMTimeout;
					xhr.onreadystatechange = function () {
						if (xhr.readyState == XMLHttpRequest.DONE) {
							if (xhr.status == 404 && xhr.responseText.includes('API_COMMAND_NOT_FOUND')) {
								resolve(true);
							}
							else {
								resolve(false);
							}
						}
					};
					xhr.open('POST', this.host, true);
					xhr.send(null);
				});
			},
	
			download: function(job: DownloadJob){
	
				let data = new URLSearchParams();
				let urls = '';
				let cookies = '';
				let descriptions = '';
				for(let dlInfo of job.links){
					urls += dlInfo.url + "\r\n";
					cookies += dlInfo.cookies + "\r\n";
					descriptions += dlInfo.desc + "\r\n";
				}

				let autostart = (Options.opt.JDownloaderAutoStart)? '1' : '0';
				data.append('autostart', autostart);
				data.append('package', 'Grabby');
				data.append('referer', job.referer);
				data.append('urls', urls);
				data.append('descriptions', descriptions);
				data.append('cookies', cookies);
				let emptyLine = Array(job.links.length).fill('').join("\r\n")
				data.append('fnames', emptyLine);
				data.append('httpauth', emptyLine);
				data.append('source', browser.runtime.getURL(''));
	
				let xhr = new XMLHttpRequest();
				xhr.open('POST',this.host + "/flashgot",true);
				xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
				xhr.send(data);
			}
		}
	
	}

	static getAvailableDMs(): Promise<string[]>
	{
		BrowserDMs.availableDMs = [];
		BrowserDMs.polledDms = 0;

		return new Promise((resolve) => 
		{	
			for(let dmName in BrowserDMs.dms)
			{
				BrowserDMs.dms[dmName].isAvailable().then((avail) => {
					if(avail){
						BrowserDMs.availableDMs.push(dmName);
					}
				})
				.finally(() => {
					BrowserDMs.polledDms++;
				});
			}
	
			let int = setInterval(() => {
				if(BrowserDMs.polledDms === Object.keys(BrowserDMs.dms).length)
				{
					clearInterval(int);
					resolve(BrowserDMs.availableDMs);
				}
			}, 100);
		});
	}

}