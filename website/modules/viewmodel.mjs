/***************************************************************************
    project.......: icb-ws
    description...: HTML5 front-end for ICB
    begin.........: 12/2019
    copyright.....: Sebastian Fedrau
    email.........: sebastian.fedrau@gmail.com
 ***************************************************************************/

/***************************************************************************
    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
    OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
    ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.
 ***************************************************************************/
import {ConnectionState} from "./core.mjs";

export function ChannelListener() {}

ChannelListener.prototype.added = function(sender, channelName) {}
ChannelListener.prototype.removed = function(sender, channelName) {}
ChannelListener.prototype.highlighted = function(sender, channelName, highlighted) {}
ChannelListener.prototype.received = function(sender, channelName, message) {}

export function ViewModel()
{
	let _title = "";
	let _group = "";
	let _nick = "";
	let _connectionState = ConnectionState.DISCONNECTED;
	const _propertyChangeListeners = new Set();
	const _channelListeners = new Set();
	const _channels = new Map();
	let _selectedChannel = "";

	function Channel()
	{
		this.messages = new Array();
		this.highlighted = false;
	}

	function firePropertyChanged(propertyName, oldValue, newValue)
	{
		if(oldValue !== newValue)
		{
			for(let fn of _propertyChangeListeners)
			{
				fn(this, propertyName, oldValue, newValue);
			}
		}
	}

	function ensureChannel(name)
	{
		if(!_channels.has(name))
		{
			 _channels.set(name, new Channel());

			_channelListeners.forEach(l => { l.added(this, name); });

			if(_channels.size == 1)
			{
				_selectedChannel = name;

				firePropertyChanged("selectedChannel", "", _selectedChannel);
			}
		}
	}

	function appendMessage(channelName, message)
	{
		const channel = _channels.get(channelName);

		channel.messages.push(message);

		_channelListeners.forEach(l => { l.received(this, channelName, message); });

		if(channelName !== _selectedChannel)
		{
			channel.highlighted = true;

			_channelListeners.forEach(l => { l.highlighted(this, channelName, true); });
		}
	}

	return Object.freeze(
	{
		get connectionState()
		{
			return _connectionState;
		},
		set connectionState(state)
		{
			firePropertyChanged("connectionState", _connectionState, state);
			_connectionState = state;
		},
		get title()
		{
			return _title;
		},
		set title(title)
		{
			firePropertyChanged("title", _title, title);
			_title = title;
		},
		get group()
		{
			return _group;
		},
		set group(group)
		{
			firePropertyChanged("group", _group, group);
			_group = group;
		},
		get nick()
		{
			return _nick;
		},
		set nick(nick)
		{
			firePropertyChanged("nick", _nick, nick);
			_nick = nick;
		},
		get selectedChannel()
		{
			return _selectedChannel;
		},
		set selectedChannel(channelName)
		{
			const channel = _channels.get(channelName);

			if(channel.highlighted)
			{
				channel.highlighted = false;

				_channelListeners.forEach(l => { l.highlighted(this, channelName, false); });
			}

			firePropertyChanged("selectedChannel", _selectedChannel, channelName);
			_selectedChannel = channelName;
		},
		closeChannel: function(channelName)
		{
			if(channelName !== "open")
			{
				_channels.delete(channelName);

				_channelListeners.forEach(l => { l.removed(this, channelName); });

				if(channelName === _selectedChannel)
				{
					this.selectedChannel = "open";
				}
			}
		},
		appendMessage: function(message)
		{
			const channelName = message.type === "personal" ? ("@" + message.sender)
			                                                : "open";

			ensureChannel(channelName);
			appendMessage(channelName, message);
		},
		getMessages: function(channelName)
		{
			let messages = new Array();

			if(_channels.has(channelName))
			{
				messages = _channels.get(channelName).messages.slice(0);
			}

			return messages;
		},
		addPropertyChangeListener: function(fn)
		{
			_propertyChangeListeners.add(fn);
		},
		addChannelListener: function(fn)
		{
			_channelListeners.add(fn);
		}
	});
}
