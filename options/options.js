//TODO: chekc all included scripts in htmls and see if we still need them

var DLGPop = new DownloadGrabPopup();

// load current options when page is loaded
document.addEventListener("DOMContentLoaded", loadOptions);

// save options when save is clicked
document.querySelector("form").addEventListener("submit", saveOptions);

// saves the options in the HTML form into browser storage and then applies it in runtime too
async function saveOptions(e) {

	e.preventDefault();

	let optionsData = Options.optionsData;

	let optionsToSave = {};

	for(let optionName in optionsData)
	{
		let optionType = optionsData[optionName].type;
		let e = document.getElementById(optionName);

		if(!e){
			continue;
		}

		switch(optionType)
		{
			case 'textbox':
				optionsToSave[optionName] = e.value;
				break;
			case 'checkbox':
				optionsToSave[optionName] = e.checked;
				break;
			case 'dropdown':
				optionsToSave[optionName] = e.value;
				break;
		}
	}

	//options are saved in local storage but we need to update runtime options too
	message = {
		type: Messaging.TYP_SAVE_OPTIONS,
		options: optionsToSave
	};
	Messaging.sendMessage(message);

}

// loads options from browser storage and processes them to create a form
async function loadOptions()
{
	let message = {type: Messaging.TYP_GET_DLG};
	let res = await Messaging.sendMessage(message);
	DLGPop.availableDMs = res.DLGJSON.availableDMs;

	//get the currently saved options
	let options = await Options.load();

	let uiOptions = {};

	//process the raw options into an object with data for UI
	for(let option in options)
	{
		let optionVal = options[option];
		let optionData = Options.optionsData[option];
		uiOptions[option] = {};
		Object.assign(uiOptions[option], optionData);
		uiOptions[option].value = optionVal;
	}

	//iterate through the UI options and create each option as a <div> then append it to the form
	for(let option in uiOptions)
	{
		let optionData = uiOptions[option];
		optionData.name = option;
		let optionDiv = createOptionDiv(optionData);
		document.getElementById('options-form').appendChild(optionDiv);
		//put a line after each section
		if(optionData.endsection){
			let hr = document.createElement('hr');
			document.getElementById('options-form').appendChild(hr);
		}
	}

	//finally create the submit button
	let btn = document.createElement('button');
	btn.setAttribute('class', 'browser-style');
	btn.setAttribute('type', 'submit');
	btn.innerHTML = "Save";
	document.getElementById('options-form').appendChild(btn);
	
}

function createOptionDiv(optionData)
{
	let div = document.createElement('div');
	div.setAttribute('class', 'panel-formElements-item');
	div.appendChild(createLabel(optionData));
	div.appendChild(createElement(optionData));
	return div;
}

function createElement(optionData)
{
	var e;

	switch (optionData.type)
	{
		case 'textbox':
			e = createTextBox(optionData);
			break;
		case 'checkbox':
			e = createCheckBox(optionData);
			break;
		case 'dropdown':
			e = createDropDown(optionData);
			break;
	}

	e.setAttribute("id", optionData.name);

	if(optionData.attrs)
	{
		for(let attr of optionData.attrs){
			e.setAttribute(attr.name, attr.value);
		}
	}

	return e;
}

function createLabel(optionData)
{
	let label = document.createElement('label');
	label.setAttribute("for", optionData.name);
	label.innerHTML = optionData.desc;
	return label;
}

function createCheckBox(optionData)
{
	let checkBox = document.createElement("input");
	checkBox.setAttribute("type", "checkbox");
	checkBox.setAttribute("id", optionData.name);
	checkBox.checked = optionData.value;
	return checkBox;
}

function createTextBox(optionData)
{
	let txtBox = document.createElement("input");
	txtBox.setAttribute("type", "text");
	txtBox.setAttribute("id", optionData.name);
	txtBox.value = optionData.value;
	return txtBox;
}

function createDropDown(optionData)
{
	//populate the list
	let itemsList = optionData.getListData(DLGPop);

	let dropDwn = document.createElement("select");
	dropDwn.setAttribute("id", optionData.name);

	for(let itemName of itemsList)
	{
		let item = document.createElement('option');
		item.value = itemName;
		item.innerHTML = itemName;
		item.id = itemName;
		item.onclick = function(){
			let selectedItem = dropDwn.options[dropDwn.selectedIndex].value;
			document.getElementById(optionData.name).value = selectedItem;
		};
		dropDwn.appendChild(item);
		//is this the selected one?
		if(optionData.value === item.value){
			item.setAttribute('selected', 'selected');
			dropDwn.value = optionData.value;
		}
	}

	return dropDwn;

}