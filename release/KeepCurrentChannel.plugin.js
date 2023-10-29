/**
 * @name KeepCurrentChannel
 * @version 1.1.1
 * @author BrandonXLF
 * @description Attempt to navigate the channel you were in before switching accounts.
 * @website https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/KeepCurrentChannel
 * @source https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/KeepCurrentChannel.plugin.js
 * @authorLink https://github.com/BrandonXLF/
 */
module.exports = (() => {
	const config = {"info":{"version":"1.1.1","description":"Attempt to navigate the channel you were in before switching accounts.","name":"KeepCurrentChannel","github":"https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/KeepCurrentChannel","github_raw":"https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/KeepCurrentChannel.plugin.js","authors":[{"name":"BrandonXLF","link":"https://github.com/BrandonXLF/"}]},"main":"index.js"};

	return !global.ZeresPluginLibrary ? class {
		constructor() {
			this._config = config;

			BdApi.showConfirmationModal(
				'Library Missing',
				`The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`,
				{
					confirmText: 'Download Now',
					cancelText: 'Cancel',
					onConfirm: async () => {
						try {
							const res = await fetch('https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js');
							
							if (res.status !== 200) throw new Error();
							
							const text = await res.text();
							const filePath = require('path').join(BdApi.Plugins.folder, '0PluginLibrary.plugin.js');

							await new Promise(resolve => {
								require('fs').writeFile(filePath, text, resolve);
							});
						} catch (e) {
							BdApi.alert('Error', 'Could not download library plugin. Try again later or download it manually from https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js');
						}
					}
				}
			);
		}

		start() {}

		stop() {}
	} : ((Plugin, Library) => {
		const {
			Patcher,
			DiscordModules
		} = Library;
		const {
			Dispatcher,
			NavigationUtils,
			SelectedChannelStore,
			SelectedGuildStore,
			ChannelStore
		} = DiscordModules;
		return class KeepChannel extends Plugin {
			previous;
	
			onStart() {
				Patcher.before(Dispatcher, 'dispatch', (_, [e]) => {
					if (e.type == 'LOGOUT' && e.isSwitchingAccount) {
						this.previous = {
							guild: SelectedGuildStore.getGuildId(),
							channel: SelectedChannelStore.getChannelId()
						};
					}
				});
				Patcher.after(Dispatcher, 'dispatch', (_, [e]) => {
					if (e.type == 'CONNECTION_OPEN' && this.previous) {
						if (ChannelStore.hasChannel(this.previous.channel)) NavigationUtils.transitionToGuild(this.previous.guild, null, this.previous.channel);
						this.previous = undefined;
					}
				});
			}
	
			onStop() {
				Patcher.unpatchAll();
			}
	
		};
	})(...global.ZeresPluginLibrary.buildPlugin(config));
})();