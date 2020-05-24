// load current options when page is loaded
document.addEventListener("DOMContentLoaded", loadCurrentOptions);

// save options when save is clicked
document.querySelector("form").addEventListener("submit", saveOptions);


function saveOptions(e) {

	e.preventDefault();

	var optionElements = document.querySelectorAll("input");
	var options = {};

	optionElements.forEach(function (optionElement) {

		let optionName = optionElement.getAttribute("id");
		let optionValue = '';

		switch (optionElement.getAttribute("type").toLowerCase()) {
			case 'checkbox':
				optionValue = optionElement.checked;
				break;
			default:
				//for dropdowns we have a hidden textbox so they're also text
				optionValue = optionElement.value;
				break;
		}

		options[optionName] = optionValue;
	});

	browser.storage.local.set(options);

	let message = {
		type: DG.Messaging.TYP_SAVE_OPTIONS,
		options: options
	};

	browser.runtime.sendMessage(message);

}

async function loadCurrentOptions() {

	let savedOptions = await browser.storage.local.get(defaultOptions);
	let bgData = await browser.runtime.sendMessage({type: DG.Messaging.TYP_GET_BG_DATA});
	let availableDMs = bgData.appJSON.runtime.availableDMs;

	console.log("got the options: ", savedOptions);
	let optionNames = Object.keys(defaultOptions);

	for(let optionName of optionNames){

		let optionValue = savedOptions[optionName];
		let defaultValue = defaultOptions[optionName];
		let optionType = typeof defaultValue;

		switch (optionType) {
			case "boolean":
				setCheckBoxValue(optionName, optionValue, defaultValue);
				break;
			default:
				setTextBoxValue(optionName, optionValue, defaultValue);
				break;
		}
	}
	//populate available DMs
	let dmsDropDown = document.getElementById('availableDMs');
	for(let dmName of availableDMs){
		let option = document.createElement('option');
		option.value = dmName;
		option.innerHTML = dmName;
		option.id = dmName;
		option.onclick = function(){
			let selectedDM = dmsDropDown.options[dmsDropDown.selectedIndex].value;
			document.getElementById('defaultDM').value = selectedDM;
		};
		dmsDropDown.appendChild(option);
	}
	//select defaultDM in the list
	let defaultDMName = document.getElementById('defaultDM').value;
	if(defaultDMName){
		console.log('setting default dm: ', defaultDMName);
		document.getElementById(defaultDMName).setAttribute('selected', 'selected');
	}

}

function setCheckBoxValue(id, value, defaultValue) {
	document.querySelector(`#${id}`).checked = ((typeof value) === "boolean") ?
		value : defaultValue;
}

function setTextBoxValue(id, value, defaultValue) {
	document.querySelector(`#${id}`).value =
		((typeof value) === "number" || (typeof value) === "string") ?
		value : defaultValue;
}