/**
 * @name KeepCurrentChannel
 * @invite 
 * @authorLink https://github.com/BrandonXLF/
 * @donate 
 * @patreon 
 * @website https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/KeepCurrentChannel
 * @source https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/KeepCurrentChannel.plugin.js
 */
/*@cc_on
@if (@_jscript)
	
	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/

module.exports = (() => {
    const config = {"main":"index.js","info":{"name":"KeepCurrentChannel","authors":[{"name":"BrandonXLF","github_username":"BrandonXLF"}],"version":"1.0.0","description":"Attempt to navigate the channel you were in before switching accounts.","github":"https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/KeepCurrentChannel","github_raw":"https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/KeepCurrentChannel.plugin.js","authorLink":"https://github.com/BrandonXLF/"}};

    return !global.ZeresPluginLibrary ? class {
        constructor() {this._config = config;}
        getName() {return config.info.name;}
        getAuthor() {return config.info.authors.map(a => a.name).join(", ");}
        getDescription() {return config.info.description;}
        getVersion() {return config.info.version;}
        load() {
            BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: () => {
                    require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                    });
                }
            });
        }
        start() {}
        stop() {}
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Library) => {
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
          if (ChannelStore.hasChannel(this.previous.channel)) NavigationUtils.transitionToGuild(this.previous.guild, this.previous.channel);
          this.previous = undefined;
        }
      });
    }

    onStop() {
      Patcher.unpatchAll();
    }

  };
};
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/