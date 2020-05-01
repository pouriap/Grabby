'use strict';

var fs = require('fs');
var path = require('path');

function exists(directory, callback) {
	fs.stat(directory, (e) => {

		if (e && e.code === 'ENOENT') {
			fs.mkdir(directory, callback);
		} else {
			callback(e);
		}
	});
}

var {id} = require('./config.js');
var dir = path.join(process.argv[2], id);

var {exec} = require('child_process');

console.log(`.. Writting to Firefox Registry`);
console.log(`.. Key: HKCU\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\${id}`);
exec(`REG ADD "HKCU\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\${id}" /ve /t REG_SZ /d "%LocalAPPData%\\${id}\\manifest.json" /f`);
console.log(`.. Key: HKLM\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\${id}`);
exec(`REG ADD "HKLM\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\${id}" /ve /t REG_SZ /d "%LocalAPPData%\\${id}\\manifest.json" /f`);

function manifest(callback) {

	exists(dir, (e) => {
		if (e) {
			throw e;
		}

		let manifest = {};
		manifest["name"] = id;
		manifest["description"] = "Download Grab Native Host";
		manifest["type"] = "stdio";
		manifest["allowed_extensions"] = ["download_grab@pouria.p"];
		manifest["path"] = "run.bat";

		fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest), (e) => {
			if (e) {
				throw e;
			}
			callback();
		});
	});
}

function application(callback) {
	fs.writeFile(path.join(dir, 'run.bat'), `@echo off\n\n"%~dp0node.exe" "%~dp0host.js"`, (e) => {
		if (e) {
			throw e;
		}
		fs.createReadStream('host.js').pipe(fs.createWriteStream(path.join(dir, 'host.js')));
		fs.createReadStream('config.js').pipe(fs.createWriteStream(path.join(dir, 'config.js')));
		fs.createReadStream('messaging.js').pipe(fs.createWriteStream(path.join(dir, 'messaging.js')));
		fs.createReadStream('FlashGot.exe').pipe(fs.createWriteStream(path.join(dir, 'FlashGot.exe')));
		try {
			fs.createReadStream(process.argv[0]).pipe(fs.createWriteStream(path.join(dir, 'node.exe')));
		} catch (e) {}
		callback();
	});
}


manifest(() => {
	application(() => {
		console.error('.. Native Host is installed in', dir);
		console.error('\n\n>>> Application is ready to use <<<\n\n');
	});	
})


