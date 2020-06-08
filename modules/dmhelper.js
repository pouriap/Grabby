class DMHelper{

	static async getAvailableDMs(){

		if(typeof DMHelper.availableDMs === 'undefined'){
			let availableDMs = [];
			for(let dmName in DMHelper.dms){
				let available = await DMHelper.dms[dmName].isAvailable();
				if(available){
					availableDMs.push(dmName);
				}
			}
			DMHelper.availableDMs = availableDMs;
		}

		return DMHelper.availableDMs;
	}

}

DMHelper.dms = {

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

		download: function(job){

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

	}

}