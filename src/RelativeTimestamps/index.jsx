module.exports = (Plugin, Library) => {
	const { Patcher, DiscordModules, WebpackModules } = Library;
	const { React } = DiscordModules;
	const MessageTimestamp = WebpackModules.find(
		m => m?.toString?.().includes('MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL'),
		{
			defaultExport: false
		}
	);
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
	const unitsWithoutSeconds = units.slice(0, -1);
	
	function formatAgo(start, end, hideSeconds) {
		let duration = moment.duration(end - start),
			parts = [],
			useUnits = hideSeconds ? unitsWithoutSeconds : units;

		useUnits.forEach(unit => {
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
			return <span ref={this.ref}>{formatAgo(this.props.start, this.state.end, this.props.shouldHideSeconds?.())}</span>;
		}
	}

	return class RelativeTimestamps extends Plugin {
		// Discord sometimes sets the timestamp in the future
		earliestKnownExistences = {};
		shouldHideSeconds = () => this.settings.hideSeconds;
		
		getEarliestKnownExistence(id) {
			if (id && !this.earliestKnownExistences[id]) this.earliestKnownExistences[id] = Date.now();
			
			return this.earliestKnownExistences[id] || Date.now();
		}
		
		addToTimestamp(messageSent, timestamp) {
			let renderChildren = timestamp.props.children.props.children;
			
			timestamp.props.children.props.children = (...childrenArgs) => {
				let children = renderChildren(...childrenArgs);
				
				let agoElement = <AgoElement start={messageSent} shouldHideSeconds={this.shouldHideSeconds} />;
				
				if (this.settings.relativeOnly) {
					children.props.children = agoElement;
					return children;
				}
				
				if (!Array.isArray(children.props.children))
					children.props.children = [children.props.children];

				children.props.children.push(' - ', agoElement);

				return children;
			};
		}
		
		onStart() {
			Patcher.after(MessageTimestamp, 'Z', (_, [props], val) => {
				let isEditTimestamp = props.children?.props.className === messageClasses.edited;

				let messageSent = Math.min(props.timestamp.valueOf(), this.getEarliestKnownExistence(props.id));
				
				if (!props.compact && !isEditTimestamp && this.settings.showInTimestamp)
					this.addToTimestamp(messageSent, val);
				
				val.props.children.props.text = <div>
					{val.props.children.props.text} - <AgoElement start={messageSent} />
				</div>;
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