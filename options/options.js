
// load current options when page is loaded
document.addEventListener("DOMContentLoaded", loadCurrentOptions);

// save options when save is clicked
document.querySelector("form").addEventListener("submit", saveOptions);


async function saveOptions(e) {

	e.preventDefault();

	var optionElements = document.querySelectorAll("input");
	var options = {};

	optionElements.forEach(function(optionElement){
		let optionName = optionElement.getAttribute("id");
		let optionValue = optionElement.value;
		options[optionName] = optionValue;
	});

	browser.storage.local.set(options);

	let page = await browser.runtime.getBackgroundPage();

	page.app.options = options;

}

function loadCurrentOptions() {

	let getting = browser.storage.local.get(defaultOptions);
	getting.then(setCurrentChoices, onError);

	function setCurrentChoices(options) {
		console.log("got the options: ", options);
		let optionNames = Object.keys(options);
		optionNames.forEach(function(optionName){
			let optionValue = options[optionName];
			document.querySelector(`#${optionName}`).value = optionValue || defaultOptions[optionName];
		});
	}

	function onError(error) {
		console.log(`Error: ${error}`);
	}

}