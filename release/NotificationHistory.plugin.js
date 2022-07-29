/**
 * @name NotificationHistory
 * @version 1.1.1
 * @author BrandonXLF
 * @description View a list of all the notifications you've received since Discord was opened.
 * @website https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/NotificationHistory
 * @source https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/NotificationHistory.plugin.js
 * @authorLink https://github.com/BrandonXLF/
 */
module.exports = (() => {
	const config = {"info":{"version":"1.1.1","description":"View a list of all the notifications you've received since Discord was opened.","name":"NotificationHistory","github":"https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/NotificationHistory","github_raw":"https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/NotificationHistory.plugin.js","authorLink":"https://github.com/BrandonXLF/","authors":[{"name":"BrandonXLF"}]},"main":"index.js"};

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
    DOMTools
  } = Library;
  const {
    React,
    MessageStore,
    NavigationUtils
  } = DiscordModules;
  const RPC = WebpackModules.getByProps('handleNotificationCreate');
  const HeaderBar = WebpackModules.find(m => m.default?.displayName == 'HeaderBar');
  const {
    ScrollerThin
  } = WebpackModules.getByProps('ScrollerThin');
  const IconElement = WebpackModules.getByProps('Icon').Icon;
  const Popout = WebpackModules.findByDisplayName('Popout');
  const RecentsChannelHeader = WebpackModules.getByDisplayName('RecentsChannelHeader');
  const JumpToMessageButton = WebpackModules.getByDisplayName('JumpToMessageButton');
  const ChannelMessage = WebpackModules.find(m => m?.default?.type.toString().includes('subscribeToComponentDispatch')).default.type;
  const ChannelStore = WebpackModules.getByProps('getChannel', 'getDMFromUserId');
  const sizeClasses = WebpackModules.getByProps('size16');
  const titleClasses = WebpackModules.getByProps('base', 'uppercase');
  const iconClasses = WebpackModules.getByProps('container', 'children', 'toolbar', 'iconWrapper');
  const inboxClasses = WebpackModules.getByProps('messagesPopout', 'messagesPopoutWrap', 'emptyPlaceholder');
  const recentMentionsClasses = WebpackModules.getByProps('message', 'recentMentionsPopout');

  class NotificationStore extends EventTarget {
    #notifications = [];

    add(notification) {
      if (this.#notifications.includes(notification)) return;
      this.#notifications.unshift(notification);
      this.dispatchEvent(new CustomEvent('notification'));
    }

    getAll() {
      return this.#notifications;
    }

    get length() {
      return this.#notifications.length;
    }

  }

  class NotificationElement extends React.Component {
    constructor(props) {
      super(props);
    }

    onClick() {
      this.props.notification.onclick();
    }

    render() {
      let msg = MessageStore.getMessage(this.props.notification.message.channel_id, this.props.notification.message.id);
      let channel = ChannelStore.getChannel(this.props.notification.channelId);

      let goToMessage = () => NavigationUtils.transitionToGuild(channel.getGuildId(), channel.id, msg.id);

      if (!msg || !channel) return null;
      return /*#__PURE__*/React.createElement("div", {
        className: recentMentionsClasses.container
      }, /*#__PURE__*/React.createElement(RecentsChannelHeader, {
        channel: channel,
        gotoChannel: goToMessage
      }), /*#__PURE__*/React.createElement("div", {
        className: recentMentionsClasses.messageContainer
      }, /*#__PURE__*/React.createElement(JumpToMessageButton, {
        className: recentMentionsClasses.jumpButton,
        onJump: goToMessage
      }), /*#__PURE__*/React.createElement(ChannelMessage, {
        message: msg,
        channel: channel,
        className: recentMentionsClasses.message
      })));
    }

  }

  class NotificationHistoryDialogElement extends React.Component {
    constructor(props) {
      super(props);
      this.props.notificationStore.addEventListener('notification', this);
    }

    handleEvent(e) {
      if (e.type === 'notification') this.forceUpdate();
    }

    componentWillUnmount() {
      this.props.notificationStore.removeEventListener('notification', this);
    }

    render() {
      return /*#__PURE__*/React.createElement("div", {
        "aria-label": "Notification History",
        role: "dialog",
        tabIndex: "-1",
        "aria-model": "true"
      }, /*#__PURE__*/React.createElement("div", {
        className: `${inboxClasses.messagesPopoutWrap} notification-history-container`,
        style: {
          maxHeight: window.innerHeight - 80 + 'px'
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: `${inboxClasses.header} notification-history-header`
      }, /*#__PURE__*/React.createElement("div", {
        className: `${titleClasses.base} ${sizeClasses.size16}`
      }, "Notification History")), /*#__PURE__*/React.createElement(ScrollerThin, {
        className: "notification-history-list"
      }, this.props.notificationStore.length ? this.props.notificationStore.getAll().map(notification => {
        return /*#__PURE__*/React.createElement(NotificationElement, {
          key: notification.message.id,
          notification: notification,
          closeModal: this.props.onClose
        });
      }) : /*#__PURE__*/React.createElement("div", {
        className: inboxClasses.emptyPlaceholder
      }, /*#__PURE__*/React.createElement("div", {
        className: inboxClasses.body
      }, "Any notifications you receive will be recorded here.")))));
    }

  }

  class NotificationHistoryIconElement extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        open: false
      };
    }

    createIcon() {
      return /*#__PURE__*/React.createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        class: iconClasses.icon,
        viewBox: "0 0 24 24",
        fill: "currentColor",
        "stroke-width": "0"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M18 9V14C18 15.657 19.344 17 21 17V18H3V17C4.656 17 6 15.657 6 14V9C6 5.686 8.686 3 12 3C15.314 3 18 5.686 18 9ZM11.9999 21C10.5239 21 9.24793 20.19 8.55493 19H15.4449C14.7519 20.19 13.4759 21 11.9999 21Z",
        mask: "url(#circle)"
      }), /*#__PURE__*/React.createElement("g", {
        transform: "translate(12, 12) scale(0.5)",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "3",
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      }, /*#__PURE__*/React.createElement("polyline", {
        points: "12 8 12 12 14 14"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"
      })), /*#__PURE__*/React.createElement("mask", {
        id: "circle"
      }, /*#__PURE__*/React.createElement("rect", {
        width: "100%",
        height: "100%",
        fill: "white"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "17",
        cy: "17",
        r: "6.5",
        fill: "black"
      })));
    }

    render() {
      return /*#__PURE__*/React.createElement(Popout, {
        align: "right",
        position: "bottom",
        animation: "1",
        shouldShow: this.state.open,
        onRequestClose: () => this.setState({
          open: false
        }),
        ignoreModalClicks: true,
        autoInvert: false,
        renderPopout: popoutProps => {
          popoutProps.notificationStore = this.props.notificationStore;
          return /*#__PURE__*/React.createElement(NotificationHistoryDialogElement, popoutProps);
        },
        children: (_, popoutState) => /*#__PURE__*/React.createElement(IconElement, {
          icon: this.createIcon.bind(this),
          onClick: () => this.setState(state => ({
            open: !state.open
          })),
          tooltip: popoutState.isShown ? null : "Notification History",
          selected: popoutState.isShown
        })
      });
    }

  }

  return class NotificationHistory extends Plugin {
    notificationStore = new NotificationStore();

    onStart() {
      Patcher.after(RPC, 'handleNotificationCreate', (_, [notification]) => {
        if (!notification) return;
        this.notificationStore.add(notification);
      });
      Patcher.before(HeaderBar, 'default', (_, [props]) => {
        if (!props) return;
        let toolbarChildren = props.toolbar.props.children;
        let btnIndex = toolbarChildren.findIndex(x => x?.type?.displayName == 'RecentsButton');
        toolbarChildren.splice(btnIndex, 0, /*#__PURE__*/React.createElement(NotificationHistoryIconElement, {
          notificationStore: this.notificationStore
        }));
      });
      DOMTools.addStyle('notification-history-styles', `
				.notification-history-container {
					width: 480px;
				}
			
				.notification-history-header {
					background: var(--background-tertiary);
				}
			
				.notification-history-record {
					display: flex;
					margin: 12px;
					padding: 12px;
					background: var(--background-primary);
					cursor: pointer;
				}
				
				.notification-history-icon {
					display: flex;
				}
				
				.notification-history-icon img {
					height: 48px;
					margin-right: 12px;
				}
			`);
    }

    onStop() {
      Patcher.unpatchAll();
      DOMTools.removeStyle('notification-history-styles');
    }

  };
})(...global.ZeresPluginLibrary.buildPlugin(config));
})();