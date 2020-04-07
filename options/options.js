
function saveOptions(e) {

	e.preventDefault();

	browser.storage.local.set({
		dlListSize: document.querySelector("#dlListSize").value
	});

}

function restoreOptions() {

	function setCurrentChoice(result) {
		console.log("got the options: ", result);
		document.querySelector("#dlListSize").value = result.dlListSize || defaultOptions.dlListSize;
	}

	function onError(error) {
		console.log(`Error: ${error}`);
	}

	let getting = browser.storage.local.get("dlListSize");
	getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);