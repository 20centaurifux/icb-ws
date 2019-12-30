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
import { App, ChannelListener } from "./viewmodels.mjs";
import { GUI } from "./gui.mjs";
import { Client } from "./client.mjs";
import { Config } from "./config.mjs";

function Channels(vm, gui)
{
	ChannelListener.call(this);

	this.vm = vm;
	this.gui = gui;
}

Channels.prototype = Object.create(ChannelListener.prototype);

Channels.prototype.added = function(sender, channelName)
{
	this.gui.addChannel(channelName);
}

Channels.prototype.removed = function(sender, channelName)
{
	this.gui.removeChannel(channelName);
}

Channels.prototype.highlighted = function(sender, channelName, highlighted)
{
	this.gui.highlightChannel(channelName, highlighted);
}

Channels.prototype.received = function(sender, channelName, message)
{
	if(this.vm.selectedChannel === channelName)
	{
		this.gui.writeMessage(message);
	}
}

function Chat(gui, username, password, nick, group)
{
	const _vm = new App();
	const _gui = gui;
	const _client = new Client(username, password, nick, group);

	function bindProperties()
	{
		_vm.addPropertyChangeListener((sender, propertyName, oldValue, newValue) =>
		{
			if(propertyName === "connectionState")
			{
				_gui.connectionState = newValue;
			}
			else if(propertyName === "selectedChannel")
			{
				_gui.selectedChannel = newValue;
				_gui.group = _vm.group;

				_gui.clearMessages();

				const messages = _vm.getMessages(newValue);

				for(let message of messages)
				{
					_gui.writeMessage(message);
				}
			}
			else if(propertyName === "group")
			{
				_gui.group = newValue;
			}
			else if(propertyName === "title")
			{
				_gui.title = newValue;
			}
			else if(propertyName === "nick")
			{
				_gui.nick = newValue;
			}
		});
	}

	function bindChannels()
	{
		_vm.addChannelListener(new Channels(_vm, _gui));
	}

	function bindGUIEvents()
	{
		_gui.onSelectChannel = (sender, channelName) => _vm.selectedChannel = channelName;
		_gui.onCloseChannel = (sender, channelName) => _vm.closeChannel(channelName);
		_gui.onTextEntered = (sender, text) =>
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
		};

		_client.onSessionStateChanged = (sender, field, value) =>
		{
			switch(field)
			{
				case "group":
					_vm.group = value;
					break;

				case "topic":
					_vm.title = value;
					break;

				case "nick":
					_vm.nick = value;
					break;
			}
		};

		_client.onUserAdded = (sender, nick) =>
		{
			// TODO
		};

		_client.onUserRemoved = (sender, nick) =>
		{
			// TODO
		};

		_client.onUsersRemoved = sender =>
		{
			// TODO
		};
	}

	_gui.nick = nick;

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
		}
	});
}

function Login()
{
	const _gui = GUI();

	function bindGUIEvents()
	{
		_gui.onLogin = sender =>
		{
			const credentials = _gui.credentials();

			if(credentials.nick && credentials.group)
			{
				_gui.hideLogin();

				const chat = new Chat(_gui, Config.loginid, null, credentials.nick, credentials.group);

				chat.init();
				chat.start();
			}
		};
	}

	return Object.freeze(
	{
		init: function()
		{
			bindGUIEvents();
		}
	});
}

const login = new Login();

login.init();
