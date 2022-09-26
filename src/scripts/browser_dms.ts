type BrowserDM = {
	host: string,
	isAvailable: () => Promise<boolean>,
	download: (job: DownloadJob) => void
}

class BrowserDMs
{
	static availableDMs: string[] | undefined = undefined;

	static dms: {[index: string]: BrowserDM} = {

		'Xtreme Download Manager': {
	
			host: "http://127.0.0.1:9614",
	
			isAvailable: function(){
	
				var xdmHost = this.host;
	
				return new Promise((resolve)=>{
					let xhr = new XMLHttpRequest();
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
				for(let dlInfo of job.downloadsInfo){
					data += 'url=' + dlInfo.url + "\r\n";
					data += "res=realUA:" + navigator.userAgent + "\r\n";
					data += "cookie=" + dlInfo.cookies + "\r\n";
					data += "\r\n\r\n";
				}
	
				if(job.downloadsInfo.length === 1){
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
				for(let dlInfo of job.downloadsInfo){
					urls += dlInfo.url + "\r\n";
					cookies += dlInfo.cookies + "\r\n";
					descriptions += dlInfo.desc + "\r\n";
				}
				data.append('autostart', '0');
				data.append('package', 'Grabby');
				data.append('referer', job.referer);
				data.append('urls', urls);
				data.append('descriptions', descriptions);
				data.append('cookies', cookies);
				let emptyLine = Array(job.downloadsInfo.length).fill('').join("\r\n")
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

	static async getAvailableDMs()
	{
		if(typeof BrowserDMs.availableDMs === 'undefined')
		{
			let availableDMs = [];
			for(let dmName in BrowserDMs.dms){
				let available = await BrowserDMs.dms[dmName].isAvailable();
				if(available){
					availableDMs.push(dmName);
				}
			}
			BrowserDMs.availableDMs = availableDMs;
		}

		return BrowserDMs.availableDMs;
	}

}