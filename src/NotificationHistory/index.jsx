module.exports = (Plugin, Library) => {
	const { Patcher, DiscordModules, WebpackModules, DOMTools } = Library;
	const { React, MessageStore, NavigationUtils } = DiscordModules;
	const RPC = WebpackModules.getByProps('handleNotificationCreate');
	const HeaderBar = WebpackModules.find(m => m.default?.displayName == 'HeaderBar');
	const { ScrollerThin } = WebpackModules.getByProps('ScrollerThin');
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
	
	class NotificationElement extends React.Component  {
		constructor(props) {
			super(props);
		}
		
		onClick() {
			this.props.notification.onclick();
		}
		
		render() {
			let msg = MessageStore.getMessage(
				this.props.notification.message.channel_id,
				this.props.notification.message.id
			);
			
			let channel = ChannelStore.getChannel(this.props.notification.channelId);
			let goToMessage = () => NavigationUtils.transitionToGuild(channel.getGuildId(), channel.id, msg.id);
			
			if (!msg || !channel) return null;
			
			return <div className={recentMentionsClasses.container}>
				<RecentsChannelHeader
					channel={channel}
					gotoChannel={goToMessage}
				/>
				<div className={recentMentionsClasses.messageContainer}>
					<JumpToMessageButton
						className={recentMentionsClasses.jumpButton}
						onJump={goToMessage}
					/>
					<ChannelMessage
						message={msg}
						channel={channel}
						className={recentMentionsClasses.message}
					/>
				</div>
			</div>;
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
			return <div aria-label="Notification History" role="dialog" tabIndex="-1" aria-model="true">
				<div className={`${inboxClasses.messagesPopoutWrap} notification-history-container`} style={{maxHeight: window.innerHeight - 80 + 'px'}}>
					<div className={`${inboxClasses.header} notification-history-header`}>
						<div className={`${titleClasses.base} ${sizeClasses.size16}`}>Notification History</div>
					</div>
					<ScrollerThin className="notification-history-list">
						{this.props.notificationStore.length
							? this.props.notificationStore.getAll().map(notification => {
								return <NotificationElement key={notification.message.id} notification={notification} closeModal={this.props.onClose} />;
							})
							: <div className={inboxClasses.emptyPlaceholder}>
								<div className={inboxClasses.body}>Any notifications you receive will be recorded here.</div>
							</div>
						}
					</ScrollerThin>
				</div>
			</div>;
		}
	}
	
	class NotificationHistoryIconElement extends React.Component {
		constructor(props) {
			super(props);
			this.state = {open: false};
		}
		
		createIcon() {
			return <svg xmlns="http://www.w3.org/2000/svg" class={iconClasses.icon} viewBox="0 0 24 24" fill="currentColor" stroke-width="0">
				<path d="M18 9V14C18 15.657 19.344 17 21 17V18H3V17C4.656 17 6 15.657 6 14V9C6 5.686 8.686 3 12 3C15.314 3 18 5.686 18 9ZM11.9999 21C10.5239 21 9.24793 20.19 8.55493 19H15.4449C14.7519 20.19 13.4759 21 11.9999 21Z" mask="url(#circle)" />
				<g transform="translate(12, 12) scale(0.5)" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="12 8 12 12 14 14" />
					<path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
				</g>
				<mask id="circle">
					<rect width="100%" height="100%" fill="white" />
					<circle cx="17" cy="17" r="6.5" fill="black" />
				</mask>
			</svg>;
		}
		
		render() {
			return <Popout
				align="right"
				position="bottom"
				animation="1"
				shouldShow={this.state.open}
				onRequestClose={() => this.setState({open: false})}
				ignoreModalClicks={true}
				autoInvert={false}
				renderPopout={popoutProps => {
					popoutProps.notificationStore = this.props.notificationStore;
					return <NotificationHistoryDialogElement {...popoutProps} />;
				}}
				children={(_, popoutState) => <IconElement
					icon={this.createIcon.bind(this)}
					onClick={() => this.setState(state => ({open: !state.open}))}
					tooltip={popoutState.isShown ? null : "Notification History"}
					selected={popoutState.isShown}
				/>}
			/>;
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
				
				toolbarChildren.splice(btnIndex, 0, <NotificationHistoryIconElement notificationStore={this.notificationStore}/>);
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
	}
}