module.exports = (Plugin, Library) => {
	const { Patcher, DiscordModules, WebpackModules, Utilities } = Library;
	const { React } = DiscordModules;
	const MessageTimestamp = WebpackModules.find(m => m.default?.displayName == 'MessageTimestamp');
	const Message = WebpackModules.find(m => m?.default.toString().includes('childrenHeader', 'childrenMessageContent'));
	const moment = WebpackModules.getByProps('duration', 'now');
	const messageClasses = WebpackModules.getByProps('messageContent', 'timestampInline');
	const units = [
		{
			func: 'years',
			display: 'y'
		},
		{
			func: 'months',
			display: 'mo'
		},
		{
			func: 'days',
			display: 'd'
		},
		{
			func: 'hours',
			display: 'h'
		},
		{
			func: 'minutes',
			display: 'm'
		},
		{
			func: 'seconds',
			display: 's'
		}
	];
	
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
			this.state = {end: Date.now()};
		}

		updateTime = () => {
			if (!this.ref.current) clearInterval(this.interval);
			
			this.setState({end: Date.now()});
		}

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
			return <span ref={this.ref}> - {formatAgo(this.props.start, this.state.end)}</span>;
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

				children.props.children.push(<AgoElement start={Math.min(props.timestamp.valueOf(), this.getEarliestKnownExistence(props.id))} />);

				return children;
			};
		}
		
		onStart() {
			Patcher.after(MessageTimestamp, 'default', (_, [props], val) => {
				let isEditTimestamp = props.children?.props.className === messageClasses.edited;

				if (!props.compact && !isEditTimestamp && this.settings.showInTimestamp) this.addToTimestamp(props, val);
				
				val.props.children.props.text = <div>
					{val.props.children.props.text}
					<AgoElement start={Math.min(props.timestamp.valueOf(), this.getEarliestKnownExistence(props.id))} />
				</div>;
			});
			
			// Needed to update compact timestamps since they use memo
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
	}
}