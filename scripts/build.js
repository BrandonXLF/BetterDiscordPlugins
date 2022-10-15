const fs = require('fs/promises');
const path = require('path');

(async () => {
	const files = await fs.readdir(path.join(__dirname, '..', 'transpiled'), {withFileTypes: true});
	const folders = files.filter(x => x.isDirectory()).map(x => x.name);
	const template = (await fs.readFile(path.join(__dirname, 'template.js'))).toString();
	const releaseFolder = path.join(__dirname, '..', 'release');

	let bdFolder;

	if (process.platform === 'win32') {
		bdFolder = process.env.APPDATA;
	} else if (process.platform === 'darwin') { // mac
		bdFolder = process.env.HOME + '/Library/Preferences';
	} else {
		if (process.env.XDG_CONFIG_HOME) {
			bdFolder = process.env.XDG_CONFIG_HOME;
		} else {
			bdFolder = process.env.HOME + '/.config';
		}
	}

	bdFolder += '/BetterDiscord/';

	for (const folder of folders) {
		const pluginPath = path.join(__dirname, '..', 'transpiled', folder);
		const pluginName = path.basename(pluginPath).replace(' ', '');
		const config = require(path.join(pluginPath, 'config.json'));
		
		Object.assign(config, {
			main: 'index.js'
		});
		
		Object.assign(config.info, {
			name: pluginName,
			github: `https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/${pluginName}`,
			github_raw: `https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/${pluginName}.plugin.js`,
			authors: [{
				name: 'BrandonXLF',
				link: `https://github.com/BrandonXLF/`
			}]
		});
		
		const header = buildHeader({
			'name': config.info.name,
			'version': config.info.version,
			'author': config.info.authors.map(x => x.name).join(', '),
			'description': config.info.description,
			'website': config.info.github,
			'source': config.info.github_raw,
			'patreon': config.info.patreon,
			'donate': config.info.donate,
			'authorId': config.info.authors[0].id,
			'authorLink': config.info.authors[0].link,
			'invite': config.info.inviteCode,
		});
		
		let pluginSource = require(path.join(pluginPath, config.main)).toString();
		pluginSource = pluginSource.replace(/^ +/gm, m => '\t'.repeat(m.length / 2));
		pluginSource = pluginSource.replace(/^/gm, '\t').trim();
		
		const result = formatString(template, {
			HEADER: header,
			CONFIG: JSON.stringify(config),
			FUNCTION: pluginSource
		});
		
		const buildFileName = `${pluginName}.plugin.js`;
		
		try {
			await fs.mkdir(releaseFolder);
		} catch (e) {}
		
		const buildFile = path.join(__dirname, '..', 'release', buildFileName);
		
		await fs.writeFile(buildFile, result);
		
		console.log(`Wrote plugin ${pluginName} to ${buildFile}`);
		
		try {
			await fs.writeFile(path.join(bdFolder, 'plugins', buildFileName), result);
			
			console.log(`Wrote plugin ${pluginName} to BetterDiscord plugin folder`);
		} catch (e) {
			
		}
		
		console.log(`🎉 ${pluginName} built successfully!\n`);
	}

	function buildHeader(config) {
		let header = '/**\n';
		
		for (let key in config) {
			if (!config[key]) continue;
			
			header += ` * @${key} ${config[key]}\n`;
		}
		
		return header + ' */';
	}

	function formatString(string, values) {
		for (const val in values)
			string = string.replace(new RegExp(`{{${val}}}`, 'g'), () => values[val] ?? '');

		return string;
	}
})();