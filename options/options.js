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
				optionValue = optionElement.value;
				break;
		}

		options[optionName] = optionValue;
	});

	browser.storage.local.set(options);

	let message = {
		type: 'options',
		options: options
	};

	browser.runtime.sendMessage(message);

}

function loadCurrentOptions() {

	let getting = browser.storage.local.get(defaultOptions);
	getting.then(setCurrentChoices, onError);

	function setCurrentChoices(savedOptions) {

		console.log("got the options: ", savedOptions);
		let optionNames = Object.keys(defaultOptions);

		optionNames.forEach(function (optionName) {

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

		});

	}

	function onError(error) {
		console.log(`Error: ${error}`);
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