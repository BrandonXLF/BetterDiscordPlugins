/**
 * @name RelativeTimestamps
 * @invite 
 * @authorLink https://github.com/BrandonXLF/
 * @donate 
 * @patreon 
 * @website https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/RelativeTimestamps
 * @source https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/RelativeTimestamps.plugin.js
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
    const config = {"main":"index.js","info":{"name":"RelativeTimestamps","authors":[{"name":"BrandonXLF"}],"version":"1.0.0","description":"Add relative timestamps to messages.","github":"https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/RelativeTimestamps","github_raw":"https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/RelativeTimestamps.plugin.js","authorLink":"https://github.com/BrandonXLF/"},"defaultConfig":[{"type":"switch","id":"showInTimestamp","name":"Show relative timestamp in the message timestamp in addition to the tooltip.","value":true}]};

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
    DiscordModules,
    WebpackModules,
    Utilities
  } = Library;
  const {
    React
  } = DiscordModules;
  const MessageTimestamp = WebpackModules.find(m => m.default?.displayName == 'MessageTimestamp');
  const Message = WebpackModules.find(m => m?.default.toString().includes('childrenHeader', 'childrenMessageContent'));
  const moment = WebpackModules.getByProps('duration', 'now');
  const messageClasses = WebpackModules.getByProps('messageContent', 'timestampInline');
  const units = [{
    func: 'years',
    display: 'y'
  }, {
    func: 'months',
    display: 'mo'
  }, {
    func: 'days',
    display: 'd'
  }, {
    func: 'hours',
    display: 'h'
  }, {
    func: 'minutes',
    display: 'm'
  }, {
    func: 'seconds',
    display: 's'
  }];

  function formatAgo(start, end) {
    let duration = moment.duration(end - start),
        parts = [];
    units.forEach(unit => {
      let time = duration[unit.func]();
      if (time) parts.push(time + unit.display);
    });
    let timeAgo = parts.join(' ');
    return timeAgo ? timeAgo + ' ago' : 'Just now';
  }

  class AgoElement extends React.PureComponent {
    constructor(props) {
      super(props);
      this.ref = React.createRef();
      this.state = {
        end: Date.now()
      };
    }

    updateTime = () => {
      if (!this.ref.current) clearInterval(this.interval);
      this.setState({
        end: Date.now()
      });
    };
    onIntersectionChange = entries => entries.forEach(entry => {
      if (this.interval) clearInterval(this.interval);

      if (entry.isIntersecting) {
        this.updateTime();
        this.interval = setInterval(this.updateTime, 500);
      }
    });

    componentDidMount() {
      this.observer = new IntersectionObserver(this.onIntersectionChange);
      this.observer.observe(this.ref.current);
    }

    componentWillUnmount() {
      this.observer.disconnect();
    }

    render() {
      return /*#__PURE__*/React.createElement("span", {
        ref: this.ref
      }, " - ", formatAgo(this.props.start, this.state.end));
    }

  }

  return class NotificationFilter extends Plugin {
    // Discord sometimes sets the timestamp in the future
    earliestKnownExistences = {};

    getEarliestKnownExistence(id) {
      if (id && !this.earliestKnownExistences[id]) this.earliestKnownExistences[id] = Date.now();
      return this.earliestKnownExistences[id] || Date.now();
    }

    addToTimestamp(props, timestamp) {
      let renderChildren = timestamp.props.children.props.children;

      timestamp.props.children.props.children = (...childrenArgs) => {
        let children = renderChildren(...childrenArgs);
        if (!Array.isArray(children.props.children)) children.props.children = [children.props.children];
        children.props.children.push( /*#__PURE__*/React.createElement(AgoElement, {
          start: Math.min(props.timestamp.valueOf(), this.getEarliestKnownExistence(props.id))
        }));
        return children;
      };
    }

    onStart() {
      Patcher.after(MessageTimestamp, 'default', (_, [props], val) => {
        let isEditTimestamp = props.children?.props.className === messageClasses.edited;
        if (!props.compact && !isEditTimestamp && this.settings.showInTimestamp) this.addToTimestamp(props, val);
        val.props.children.props.text = /*#__PURE__*/React.createElement("div", null, val.props.children.props.text, /*#__PURE__*/React.createElement(AgoElement, {
          start: Math.min(props.timestamp.valueOf(), this.getEarliestKnownExistence(props.id))
        }));
      }); // Needed to update compact timestamps since they use memo

      Patcher.after(Message, 'default', (_, __, val) => {
        let messageTimestamp = Utilities.findInReactTree(val, c => c?.type?.type?.displayName == 'MessageTimestamp');
        if (messageTimestamp) messageTimestamp.type.type = MessageTimestamp.default;
      });
    }

    onStop() {
      Patcher.unpatchAll();
    }

    getSettingsPanel() {
      return this.buildSettingsPanel().getElement();
    }

  };
};
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/