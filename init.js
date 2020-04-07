var idmAvailable = false;
var app;

initIDM();
initApplication();


function initIDM(){

	//todo: shayad init haii hast the addone IDM khodesh mikone ke ma kar mikonim
	// pas beddone addone idm emtehan konim

	var initMessage = "MSG#2#6#2#2321:1:0:1294:704:-7:-7:1.25,117=37:Toolbox - Extension / Download Assist;";
	var port = browser.runtime.connectNative("com.tonec.idm");
	
	//this will only be called when IDM is available and reachable
	port.onMessage.addListener(function(m) {
		idmAvailable = true;
        console.log('IDM is available');
        port.disconnect();
	});

	//this will only be called when the other end disconnects the connection
	//i.e. when IDM isn't available 
    port.onDisconnect.addListener((p) => {
		//just to be sure
		if(!idmAvailable){
			console.log("IDM is unavailable!");
		}
    });

	port.postMessage(initMessage);

	//if IDM is available the onMessage() will disconnect port
	//if IDM is unavailable it will automatically disconnect port
	//but just for added safety we disconnect it in a timeout
	setTimeout( ()=> port.disconnect(), 500);

}

function initApplication(){
	app = new DlAssistApp();
}