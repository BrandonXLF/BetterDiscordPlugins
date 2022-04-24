const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

var queue = [
	['git submodule init', path.join(__dirname, '..')],
	['git submodule update', path.join(__dirname, '..')],
	['npm install', path.join(__dirname, '../BDPluginLibrary')],
	[fs.writeFile, path.join(__dirname, '../BDPluginLibrary/config.json'), '{\n\t"pluginsFolder": "./../transpiled",\n\t"releaseFolder": "./../release"\n}']
];

function runCommand(args) {
	if (!args) return;

	console.log('Running:', ...args);

	if (typeof args[0] == 'string') {
		exec(args[0], {cwd: args[1]}, (err, stdout, stderr) => {
			if (err) throw err;
			if (stdout) console.log(`${stdout}`);
			if (stderr) console.error(`${stderr}`);
			runCommand(queue.shift());
		});

		return;
	}

	args[0](...args.slice(1), err => {
		if (err) throw err;
		runCommand(queue.shift());
	});
}

runCommand(queue.shift());