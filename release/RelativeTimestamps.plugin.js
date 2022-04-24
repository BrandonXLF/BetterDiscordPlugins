/**
 * @name RelativeTimestamps
 * @version 1.0.0
 * @author BrandonXLF
 * @description Add relative timestamps to messages.
 * @website https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/RelativeTimestamps
 * @source https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/RelativeTimestamps.plugin.js
 * @authorLink https://github.com/BrandonXLF/
 */
module.exports = (() => {
	const config = {"info":{"version":"1.0.0","description":"Add relative timestamps to messages.","name":"RelativeTimestamps","github":"https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/RelativeTimestamps","github_raw":"https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/RelativeTimestamps.plugin.js","authorLink":"https://github.com/BrandonXLF/","authors":[{"name":"BrandonXLF"}]},"defaultConfig":[{"type":"switch","id":"showInTimestamp","name":"Show relative timestamp in the message timestamp in addition to the tooltip.","value":true}],"main":"index.js"};

	return !global.ZeresPluginLibrary ? class {
		constructor() {
			this._config = config;
		}

		getName() {
			return config.info.name;
		}

		getAuthor() {
			return config.info.authors.map(a => a.name).join(', ');
		}

		getDescription() {
			return config.info.description;
		}

		getVersion() {
			return config.info.version;
		}
	
		load() {
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
							await require('fs/promises').writeFile(filePath, text);
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
})(...global.ZeresPluginLibrary.buildPlugin(config));
})();