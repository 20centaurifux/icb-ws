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
import { ConnectionState } from "./core.mjs";
import { Logon, App, ChannelListener } from "./viewmodel.mjs";
import { GUI } from "./gui.mjs";
import { Client } from "./client.mjs";
import { Config } from "./config.mjs";
import { Storage } from "./storage.mjs";

function Login()
{
	const _vm = Logon();
	const _storage = Storage();

	function bindProperties()
	{
		_vm.addPropertyChangeListener((sender, propertyName, oldValue, newValue) =>
		{
			if(propertyName === "nick")
			{
				GUI.loginForm = {"nick": newValue, "group": _vm.group};
			}
			else if(propertyName === "group")
			{
				GUI.loginForm = {"nick": _vm.nick, "group": newValue};
			}
			else if(propertyName === "loginEnabled")
			{
				GUI.loginEnabled = newValue;
			}
		});
	}
	function bindGUIEvents()
	{
		GUI.onLoginFormChanged = (sender, field, value) =>
		{
			if(field === "nick")
			{
				_vm.nick = value;
			}
			else if(field === "group")
			{
				_vm.group = value;
			}
		};

		GUI.onLogin = sender =>
		{
			if(_vm.nick && _vm.group)
			{
				try
				{
					_storage.store("lastNick", _vm.nick);
					_storage.store("lastGroup", _vm.group);
				}
				catch(e)
				{
					console.warn(e);
				}

				GUI.showChat();

				const chat = new Chat(Config.loginid, null, _vm.nick, _vm.group);

				chat.init();
				chat.start();
			}
		};
	}

	return Object.freeze(
	{
		init: function()
		{
			bindProperties();
			bindGUIEvents();

			try
			{
				_vm.nick = _storage.load("lastNick");
				_vm.group = _storage.load("lastGroup");
			}
			catch(e)
			{
				console.warn(e);
			}

			if(!_vm.nick)
			{
				_vm.nick = Config.defaultNick;
			}

			if(!_vm.group)
			{
				_vm.group = Config.defaultGroup;
			}

			GUI.showLogin();
		}
	});
}

function Channels(vm)
{
	ChannelListener.call(this);

	this.vm = vm;
}

Channels.prototype = Object.create(ChannelListener.prototype);

Channels.prototype.added = function(sender, channelName)
{
	GUI.addChannel(channelName);
}

Channels.prototype.removed = function(sender, channelName)
{
	GUI.removeChannel(channelName);
}

Channels.prototype.highlighted = function(sender, channelName, highlighted)
{
	GUI.highlightChannel(channelName, highlighted);
}

Channels.prototype.received = function(sender, channelName, message)
{
	if(this.vm.selectedChannel === channelName)
	{
		GUI.writeMessage(message);
	}
}

function Chat(username, password, nick, group)
{
	const _vm = new App();
	const _client = new Client(username, password, nick, group);

	function bindProperties()
	{
		_vm.addPropertyChangeListener((sender, propertyName, oldValue, newValue) =>
		{
			if(propertyName === "connectionState")
			{
				GUI.connectionState = newValue;
			}
			else if(propertyName === "selectedChannel")
			{
				GUI.selectedChannel = newValue;
				GUI.group = _vm.group;

				GUI.clearMessages();

				const messages = _vm.getMessages(newValue);

				for(let message of messages)
				{
					GUI.writeMessage(message);
				}
			}
			else if(propertyName === "group")
			{
				GUI.group = newValue;
			}
			else if(propertyName === "title")
			{
				GUI.title = newValue;
			}
			else if(propertyName === "nick")
			{
				GUI.nick = newValue;
			}
			else if(propertyName === "users")
			{
				GUI.users = newValue;
			}
			else if(propertyName === "userListVisible")
			{
				GUI.userListVisible = newValue;
			}
		});
	}

	function bindChannels()
	{
		_vm.addChannelListener(new Channels(_vm));
	}

	function bindGUIEvents()
	{
		GUI.onSelectChannel = (sender, channelName) => _vm.selectedChannel = channelName;
		GUI.onCloseChannel = (sender, channelName) => _vm.closeChannel(channelName);
		GUI.onTextEntered = (sender, text) =>
		{
			if(text && text.length > 0)
			{
				if(text[0] === "/")
				{
					_client.sendCommand(text);
				}
				else if(_vm.selectedChannel == "open")
				{
					_client.sendOpen(text);
				}
				else
				{
					_client.sendPersonal(_vm.selectedChannel.substring(1), text);
				}
			}
		};
	}

	function bindClientEvents()
	{
		_client.onConnectionStateChanged = (sender, state) =>
		{
			_vm.connectionState = state;
		};

		_client.onMessage = (sender, message) =>
		{
			_vm.appendMessage(message);

			try
			{
				if(message.type === "personal")
				{
					GUI.notify(message.sender, message.text);
				}
				else if(message.type === "open")
				{
					const regex = new RegExp('\\b' + _vm.nick + '\\b');

					if(regex.test(message.text))
					{
						GUI.notify(message.from, message.text);
					}
				}
				else if(message.type === "wall")
				{
					GUI.notify("WALL", message.text);
				}
				else if(message.type === "status")
				{
					if(message.category === "Notify-On" || message.category === "Notify-Off")
					{
						GUI.notify(message.category, message.text);
					}
				}
			}
			catch(e)
			{
				console.warn(e);
			}
		};

		_client.onSessionStateChanged = (sender, field, value) =>
		{
			if(field === "group")
			{
				_vm.group = value;
			}
			else if(field === "topic")
			{
				_vm.title = value;
			}
			else if(field === "nick")
			{
				_vm.nick = value;
			}
		};

		_client.onUserAdded = (sender, nick) => _vm.addUser(nick);
		_client.onUserRemoved = (sender, nick) => _vm.removeUser(nick);
		_client.onUsersRemoved = sender => _vm.clearUsers();
	}

	return Object.freeze(
	{
		init: function()
		{
			bindProperties();
			bindChannels()
			bindGUIEvents();
			bindClientEvents();
		},
		start: function()
		{
			_client.connect(Config.url);
			_vm.nick = nick;
		}
	});
}

window.onload = event => Login().init();
