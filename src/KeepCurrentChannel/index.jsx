module.exports = (Plugin, Library) => {
	const { Patcher, DiscordModules } = Library;
	const { Dispatcher, NavigationUtils, SelectedChannelStore, SelectedGuildStore, ChannelStore } = DiscordModules;
	
	return class KeepChannel extends Plugin {
		previous;
		
		onStart() {
			Patcher.before(Dispatcher, 'dispatch', (_, [e]) => {
				if(e.type == 'LOGOUT' && e.isSwitchingAccount) {
					this.previous = {
						guild: SelectedGuildStore.getGuildId(),
						channel: SelectedChannelStore.getChannelId()
					};
				}
			});
			
			Patcher.after(Dispatcher, 'dispatch', (_, [e]) => {
				if (e.type == 'CONNECTION_OPEN' && this.previous) {
					if (ChannelStore.hasChannel(this.previous.channel))
						NavigationUtils.transitionToGuild(this.previous.guild, null, this.previous.channel);

					this.previous = undefined;
				}
			});
		}
		
		onStop() {
			Patcher.unpatchAll();
		}
	}
};