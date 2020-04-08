// a super duper global variable
var app;

(async () => {

	let idmAvailable = await initIDM();
	let options = await loadOptions();
	app = new DlAssistApp(options);
	app.runtime = {};
	app.runtime.idmAvailable = idmAvailable;

})();

function handleMessage(message, sender, sendResponse) {
	console.log('message received:' + JSON.stringify(message));
	if(message.type === "options"){
		app.options = message.options;
		return Promise.resolve(app.options);
	}
	else if(message.type === "get_app"){
		return Promise.resolve(app);
	}
}
  
browser.runtime.onMessage.addListener(handleMessage);


function initIDM(){

	//todo: shayad init haii hast the addone IDM khodesh mikone ke ma kar mikonim
	// pas beddone addone idm emtehan konim

	let promise = new Promise(function(resolve){

		var initMessage = "MSG#2#6#2#2321:1:0:1294:704:-7:-7:1.25,117=37:Toolbox - Extension / Download Assist;";
		var port = browser.runtime.connectNative("com.tonec.idm");
		
		//this will only be called when IDM is available and reachable
		port.onMessage.addListener(function(m) {
			console.log('IDM is available');
			port.disconnect();
			resolve(true);
		});

		//this will only be called when the other end disconnects the connection
		//i.e. when IDM isn't available 
		port.onDisconnect.addListener((p) => {
			console.log("IDM is unavailable!");
			resolve(false);
		});

		port.postMessage(initMessage);

		//if IDM is available the onMessage() will disconnect port
		//if IDM is unavailable it will automatically disconnect port
		//but just for added safety we disconnect it in a timeout
		setTimeout( ()=> {
			port.disconnect();
			resolve(false);
		}, 500);

	});

	return promise;

}

function loadOptions(){

	let promise = new Promise(function(resolve){

		function doLoadOptions(loadedOptions) {
			console.log("loaded options: ", loadedOptions);
			resolve(loadedOptions);
		}
	
		function onError(error) {
			console.log(`Error getting options: ${error}`);
			resolve(defaultOptions);
		}
	
		let getting = browser.storage.local.get(defaultOptions);
		getting.then(doLoadOptions, onError);

	});

	return promise;
}