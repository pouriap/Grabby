'use strict';

var {spawn, execFileSync} = require('child_process');
var {constants, accessSync, existsSync, mkdirSync, readFileSync, writeFileSync} = require('fs');
var {tmpdir} = require('os');
var {id} = require('./config.js');

var availableDMsFile = getTempDir() + "\\" + "availableDMs.txt";

function getTempDir(){
	let tempDir = tmpdir() + "\\" + id;
	if(!existsSync(tempDir)){mkdirSync(tempDir, {recursive: true});}
	return tempDir;
}
function getNewTempFile(){
	let name = Math.floor(Math.random()*10000);
	let tempDir = getTempDir();
	let tempFile = tempDir + "\\" + `job_${name}.fgt`;
	try {
		writeFileSync(tempFile, '', {encoding: 'utf8'});
		accessSync(tempFile, constants.W_OK);
		return tempFile;
	} catch (err) {
		return false;
	}
}

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

		doFlashGot(job, push);
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

		doFlashGot(job, push);
		done();
	}
	else{
		push({type: 'unsupported'});
		done();
	}
}
function doFlashGot(job, push){
	let jobFile = getNewTempFile();
	if(jobFile === false){
		push({type: 'download_failed', reason: 'could not create temp file'});
	}
	else{
		writeFileSync(jobFile, job, {encoding: 'utf8'});
		//todo: node waits for child processes of flashgot to also close (i.e. DMs) so we
		//have to launch it like this. Why does it do this?
		let subprocess = spawn('FlashGot.exe', [jobFile], {detached: true});
		subprocess.on('exit', (code) => {
			push({type: 'download_complete', job: job});
		});
		subprocess.stdout.on('data', (data)=>{
			push({type: 'flashgot_output', output: data.toString()});
		});
		subprocess.unref();
	}
}
/* message passing */
var nativeMessage = require('./messaging');
process.stdin
	.pipe(new nativeMessage.Input())
	.pipe(new nativeMessage.Transform(observe))
	.pipe(new nativeMessage.Output())
	.pipe(process.stdout);