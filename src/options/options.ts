//TODO: chekc all included scripts in htmls and see if we still need them

type DrawableOption = 
{
	name: string;
	optionUI: Options.OptionUI<unknown, unknown>;
}

var DLGPop: DownloadGrabPopup;

// load current options when page is loaded
document.addEventListener("DOMContentLoaded", loadOptions);

// save options when save is clicked
document.querySelector("form")?.addEventListener("submit", saveOptions);

// saves the options in the HTML form into browser storage and then applies it in runtime too
async function saveOptions(evt: Event)
{
	evt.preventDefault();

	let defaultOpts = new Options.DLGOptions();
	let optionsUI = new Options.OptionsUI(defaultOpts);

	//populate real options first and then do the deferred options
	for(let optionName in defaultOpts)
	{
		let optionUI = <Options.OptionUI<unknown, Element>> optionsUI[optionName];
		if(Options.isDeferred(optionUI)) continue;

		let e = document.getElementById(optionName);

		if(!e) log.err("Option doesn't exist in UI: ", optionName);

		optionUI.setVal(e);
	}

	//populate deferred options
	for(let optionName in defaultOpts)
	{
		let optionUI = optionsUI[optionName];
		if(!Options.isDeferred(optionUI)) continue;
		optionUI.setVal(undefined);
	}

	let msg = new Messaging.MSGSaveOptions(optionsUI.opt);
	Messaging.sendMessage(msg);
}

// loads options from browser storage and processes them to create a form
async function loadOptions()
{
	let msg = new Messaging.MSGGetDLG();
	let res = <Messaging.MSGDLGJSON> await Messaging.sendMessage(msg);
	DLGPop = new DownloadGrabPopup(res.DLGJSON);

	//get the currently saved options
	let options = await Options.load();

	let optionsUI = new Options.OptionsUI(options);

	for(let optionName in options)
	{
		let optionUI = <Options.OptionUI<unknown, unknown>> optionsUI[optionName];

		//deferred options don't have a UI
		if(Options.isDeferred(optionUI)){
			continue;
		}

		let d: DrawableOption = {
			name: optionName,
			optionUI: optionUI,
		};

		let optionDiv = createOptionDiv(d);
		document.getElementById('options-form')?.appendChild(optionDiv);

		if(optionUI.endsection)
		{
			let hr = document.createElement('hr');
			document.getElementById('options-form')?.appendChild(hr);
		}
	}

	//finally create the submit button
	let btn = document.createElement('button');
	btn.setAttribute('class', 'browser-style');
	btn.setAttribute('type', 'submit');
	btn.innerHTML = "Save";
	document.getElementById('options-form')?.appendChild(btn);
	
}

function createOptionDiv(optionData: DrawableOption)
{
	let div = document.createElement('div');
	div.setAttribute('class', 'panel-formElements-item');
	div.appendChild(createLabel(optionData));
	div.appendChild(createElement(optionData));
	return div;
}

function createElement(optionData: DrawableOption)
{
	let e: Element;

	let name = optionData.name;
	let optionUI = optionData.optionUI;

	if(Options.isCheckbox(optionUI))
	{
		e = createCheckBox(name, optionUI);
	}
	else if(Options.isTextbox(optionUI))
	{
		e = createTextBox(name, optionUI);
	}
	else if(Options.isDropdown(optionUI))
	{
		e = createDropDown(name, optionUI);
	}
	else
	{
		log.err('Unkown option type: ', optionUI);
	}

	e.setAttribute("id", optionData.name);

	if(optionUI.attrs)
	{
		for(let attr of optionUI.attrs){
			e.setAttribute(attr.name, attr.value);
		}
	}

	return e;
}

function createLabel(optionData: DrawableOption)
{
	let label = document.createElement('label');
	label.setAttribute("for", optionData.name);
	label.innerHTML = optionData.optionUI.desc;
	return label;
}

function createCheckBox(id: string, optionUI: Options.CheckboxOption)
{
	let checkBox = document.createElement("input");
	checkBox.setAttribute("type", "checkbox");
	checkBox.setAttribute("id", id);
	checkBox.checked = optionUI.getVal();
	return checkBox;
}

function createTextBox(id: string, optionUI: Options.TextboxOption)
{
	let txtBox = document.createElement("input");
	txtBox.setAttribute("type", "text");
	txtBox.setAttribute("id", id);
	txtBox.value = optionUI.getVal();
	return txtBox;
}

function createDropDown(id: string, optionUI: Options.DropdownOption)
{
	//populate the list
	let data = optionUI.getVal();
	let itemList = data.list;
	let selectedItem = data.selected;

	let dropDwn = document.createElement("select");
	dropDwn.setAttribute("id", id);

	for(let itemName of itemList)
	{
		let item = document.createElement('option');
		item.value = itemName;
		item.innerHTML = itemName;
		item.id = itemName;
		item.onclick = function(){
			let selectedItem = dropDwn.options[dropDwn.selectedIndex].value;
			(<HTMLInputElement>document.getElementById(id)).value = selectedItem;
		};
		dropDwn.appendChild(item);
		//is this the selected one?
		if(selectedItem === item.value){
			item.setAttribute('selected', 'selected');
			dropDwn.value = selectedItem;
		}
	}

	return dropDwn;
}