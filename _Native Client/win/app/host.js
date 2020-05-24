'use strict';

var {execFileSync, spawnSync} = require('child_process');
var {existsSync, mkdirSync, readFileSync, writeFileSync} = require('fs');
var {tmpdir} = require('os');
var {id} = require('./config.js');

//create a directory in temp to store stuff in
var tempDir = tmpdir() + "\\" + id;
if(!existsSync(tempDir)){mkdirSync(tempDir, {recursive: true});}
var availableDMsFile = tempDir + "\\" + "availableDMs.txt";
var jobFile = tempDir + "\\" + "job.fgt";

// closing node when parent process is killed
process.stdin.resume();
process.stdin.on('end', () => process.exit());

function observe(message, push, done) {
	let close;
	const exception = e => {
		push({
			type: 'exception',
			error: e.message
		});
		close();
	};
	close = () => {
		process.removeListener('uncaughtException', exception);
		done();
		close = () => {};
	};
	process.addListener('uncaughtException', exception);

	if(message.type === 'native_client_available'){
		let message = {type: 'native_client_available'};
		push(message);
		done();
	}
	else if(message.type === 'get_available_dms') {
		let availableDMs = [];
		try{
			execFileSync("FlashGot.exe", ['-o', availableDMsFile], {timeout: 5000});
			let file = readFileSync(availableDMsFile, {encoding: 'utf8', flag: 'r'});
			let lines = file.split('\n');
			for(let line of lines){
				if(line.indexOf('|OK') !== -1){
					let DMName = line.split("|")[0].trim();
					availableDMs.push(DMName);
				}
			}
		}catch(e){
			availableDMs = [];
		}
		let message = {type: 'available_dms', availableDMs: availableDMs};
		push(message);
		done();
	}
	else if (message.type === 'download'){
			
		let url = message.url;
		let referer = message.referer || '';
		let cookies = message.cookies || '';
		let dmName = message.dmName;
		let filename = message.filename;
		let postData = message.postData || '';
		let originPageReferer = message.originPageReferer || '';
		let originPageCookies = message.originPageCookies || '';

		let header = `1;${dmName};0;;`;
		let job = header + "\n"
					+ referer + "\n"
					+ url + "\n"
					+ filename + "\n"
					+ cookies + "\n"
					+ postData + "\n"
					+ originPageReferer + "\n"
					+ originPageCookies + "\n"
					+ "\n"	//extras
					+ "\n";	//extras
		writeFileSync(jobFile, job, {encoding: 'utf8'});
		//this is called from background and node.exe is not closed until addon is removed
		execFileSync("flashgot.exe", [jobFile]);
		done();
	}
	else if(message.type === 'download_all'){
		
		let downloadItems = message.downloadItems;
		let dmName = message.dmName;
		let header = `${downloadItems.length};${dmName};0;;`;
		let job = header + "\n"
					+ message.originPageUrl + "\n";
		for(let downloadItem of downloadItems){
			job = job + downloadItem.url + "\n" 
						+ downloadItem.description + "\n"
						+ downloadItem.cookies + "\n"
						+ "\n" //post data
		}

		job = job + message.originPageReferer + "\n"
					+ message.originPageCookies + "\n"
					+ "\n" //extras
					+ "\n" //estras

		writeFileSync(jobFile, job, {encoding: 'utf8'});
		//this is called from background and node.exe is not closed until addon is removed
		execFileSync("flashgot.exe", [jobFile]);
		done();
	}
	else{
		push({type: 'unsupported'});
		done();
	}
}
/* message passing */
var nativeMessage = require('./messaging');
process.stdin
	.pipe(new nativeMessage.Input())
	.pipe(new nativeMessage.Transform(observe))
	.pipe(new nativeMessage.Output())
	.pipe(process.stdout);