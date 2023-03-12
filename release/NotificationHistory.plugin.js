/**
 * @name NotificationHistory
 * @version 2.1.2
 * @author BrandonXLF
 * @description View a list of all the notifications you've received since Discord was opened.
 * @website https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/NotificationHistory
 * @source https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/NotificationHistory.plugin.js
 * @authorLink https://github.com/BrandonXLF/
 */
module.exports = (() => {
	const config = {"info":{"version":"2.1.2","description":"View a list of all the notifications you've received since Discord was opened.","name":"NotificationHistory","github":"https://github.com/BrandonXLF/BetterDiscordPlugins/tree/main/src/NotificationHistory","github_raw":"https://raw.githubusercontent.com/BrandonXLF/BetterDiscordPlugins/main/release/NotificationHistory.plugin.js","authors":[{"name":"BrandonXLF","link":"https://github.com/BrandonXLF/"}]},"main":"index.js"};

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
			UserStore,
			RelationshipStore
		} = DiscordModules;
		const createMessage = WebpackModules.find(m => m?.toString?.().includes('mention_everyone') && m?.toString?.().includes('return new'), {
			searchExports: true
		});
		const Dispatcher = WebpackModules.getByProps('subscribe', '_subscriptions');
		const HeaderBar = WebpackModules.find(m => m?.toString?.().includes('.toolbar'), {
			defaultExport: false
		});
		const ScrollerThin = WebpackModules.find(m => {
			let str = m?.render?.toString?.();
			return str?.includes('scrollerRef') && str?.includes('paddingFix');
		}, {
			searchExports: true
		});
		const IconElement = WebpackModules.find(m => m?.toString?.().includes('iconWrapper') && m?.toString?.().includes('hideOnClick'), {
			defaultExport: false,
			searchExports: true
		});
		const transitionToGuild = WebpackModules.find(m => m?.toString?.().includes('transitionToGuild - '), {
			searchExports: true
		});
		const Popout = WebpackModules.find(m => m?.toString?.().includes('handlePopoutPositionChange'), {
			searchExports: true
		});
		const Heading = WebpackModules.find(m => m?.toString?.().includes('data-excessive-heading-level'), {
			searchExports: true
		});
		const getChannelName = WebpackModules.find(m => m?.toString?.().includes('.recipients.map') && m?.toString?.().includes('#'), {
			searchExports: true
		});
		const getDMIcon = WebpackModules.find(m => m?.toString?.().includes('getChannelIconURL'), {
			searchExports: true
		});
		const GuildIcon = WebpackModules.find(m => m.defaultProps?.showBadge !== undefined);
		const ChannelMessage = WebpackModules.find(m => m?.type?.toString?.().includes('messageReference'));
		const ChannelStore = WebpackModules.getByProps('getChannel', 'getDMFromUserId');
		const GuildStore = WebpackModules.getByProps('getGuild', 'getGuildCount');
		const iconClasses = WebpackModules.getByProps('container', 'children', 'toolbar', 'iconWrapper');
		const inboxClasses = WebpackModules.getByProps('messagesPopout', 'messagesPopoutWrap', 'emptyPlaceholder');
		const RMPopoutClasses = WebpackModules.getByProps('expandedMarkAllReadContainer', 'container');
		const RMMessageClasses = WebpackModules.getByProps('messages', 'message', 'messageContainer');
		const RMChannelClasses = WebpackModules.getByProps('collapseButton', 'channel');
		const channelHeaderClasses = WebpackModules.getByProps('guildIcon', 'dmIcon');
	
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
	
			render() {
				let message = createMessage(this.props.notification.message);
				let channel = ChannelStore.getChannel(this.props.notification.channelId);
				if (!message || !channel) return null;
	
				let goToMessage = () => transitionToGuild(channel.getGuildId(), channel.id, message.id);
	
				let guild = GuildStore.getGuild(channel.getGuildId());
				let channelName = getChannelName(channel, UserStore, RelationshipStore, true);
				let img = channel.isPrivate() ? /*#__PURE__*/React.createElement("img", {
					className: channelHeaderClasses.dmIcon,
					onClick: goToMessage,
					src: getDMIcon(channel, 80)
				}) : /*#__PURE__*/React.createElement(GuildIcon, {
					className: channelHeaderClasses.guildIcon,
					onClick: goToMessage,
					guild: guild,
					active: true,
					animate: false,
					size: GuildIcon.Sizes.MEDIUM
				});
				return /*#__PURE__*/React.createElement("div", {
					className: RMChannelClasses.channel
				}, /*#__PURE__*/React.createElement("div", {
					className: `${channelHeaderClasses.channelHeader} notification-history-meg-header`
				}, img, /*#__PURE__*/React.createElement("div", {
					className: channelHeaderClasses.channelNameSection,
					onClick: goToMessage
				}, /*#__PURE__*/React.createElement(Heading, {
					className: channelHeaderClasses.channelNameHeader,
					variant: "heading-md/medium"
				}, /*#__PURE__*/React.createElement("div", {
					className: channelHeaderClasses.channelName
				}, /*#__PURE__*/React.createElement("span", {
					className: channelHeaderClasses.channelNameSpan
				}, channelName))), guild?.name && /*#__PURE__*/React.createElement(Heading, {
					className: channelHeaderClasses.subtextContainer,
					variant: "text-sm/normal"
				}, /*#__PURE__*/React.createElement("div", {
					className: `${channelHeaderClasses.subtext} ${channelHeaderClasses.guildName}`
				}, guild.name)))), /*#__PURE__*/React.createElement("div", {
					className: RMMessageClasses.messages
				}, /*#__PURE__*/React.createElement("div", {
					className: RMMessageClasses.messageContainer
				}, /*#__PURE__*/React.createElement(ChannelMessage, {
					className: `${RMMessageClasses.message} notification-history-message`,
					animateAvatar: false,
					message: message,
					channel: channel,
					onClick: goToMessage
				}))));
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
					className: RMPopoutClasses.container
				}, /*#__PURE__*/React.createElement("div", {
					className: `${inboxClasses.header} ${inboxClasses.title}`,
					style: {
						zIndex: '100'
					}
				}, /*#__PURE__*/React.createElement(Heading, {
					variant: "heading-md/medium"
				}, "Notification History")), /*#__PURE__*/React.createElement(ScrollerThin, {
					className: RMPopoutClasses.scroller
				}, this.props.notificationStore.length ? this.props.notificationStore.getAll().map(notification => /*#__PURE__*/React.createElement(NotificationElement, {
					key: notification.message.id,
					notification: notification,
					closeModal: this.props.onClose
				})) : /*#__PURE__*/React.createElement("div", {
					className: "notification-history-placeholder"
				}, "Any notifications you receive will be recorded here."))));
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
			onNotification = notification => this.notificationStore.add(notification);
	
			onStart() {
				Dispatcher.subscribe('RPC_NOTIFICATION_CREATE', this.onNotification);
				Patcher.before(HeaderBar, 'ZP', (_, [props]) => {
					if (!props) return;
					let toolbarChildren = props.toolbar.props.children;
					if (!toolbarChildren) return;
					let btnIndex = toolbarChildren.findIndex(x => x?.type?.toString().includes('INBOX'));
					toolbarChildren.splice(btnIndex, 0, /*#__PURE__*/React.createElement(NotificationHistoryIconElement, {
						notificationStore: this.notificationStore
					}));
				});
				DOMTools.addStyle('notification-history-styles', `
					.notification-history-placeholder {
						margin: 4em 0;
						color: var(--text-normal);
						text-align: center;
					}
					
					.notification-history-message:hover {
						cursor: pointer;
					}
					
					.notification-history-meg-header {
						position: static;
						padding-left: 0;
					}
				`);
			}
	
			onStop() {
				Dispatcher.unsubscribe('RPC_NOTIFICATION_CREATE', this.onNotification);
				Patcher.unpatchAll();
				DOMTools.removeStyle('notification-history-styles');
			}
	
		};
	})(...global.ZeresPluginLibrary.buildPlugin(config));
})();