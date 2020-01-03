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

export function Client(username, password, nick, group)
{
	const _username = username;
	const _password = password;
	const _nick = nick;
	const _group = group;
	let _onConnectionStateChanged = function(sender, state) {}
	let _onMessage = function(sender, message) {}
	let _onSessionStateChanged = function(sender, field, value) {}
	let _onUserAdded = function(sender, nick) {}
	let _onUserRemoved = function(sender, nick) {}
	let _onUsersRemoved = function(sender) {}
	let _ws;

	function messageReceived(message)
	{
		_onMessage(this, message);
	}

	function messageReceived(message)
	{
		_onMessage(this, message);
	}

	function send(json)
	{
		_ws.send(JSON.stringify(json));
	}

	function format_wl(fields)
	{
		let flag = " ";
		const nick = fields[2];
		const total_seconds = parseInt(fields[3], 10);
		const total_minutes = Math.round(total_seconds / 60);
		const total_hours = Math.round(total_minutes / 60);
		const minutes = total_minutes - (total_hours * 60);
		const parts = [];

		if(fields[1] !== " ")
		{
			flag = "*";
		}

		if(total_hours > 23)
		{
			const days = Math.round(total_hours / 24);

			parts.push(days + "d");

			const hours = total_hours - (days * 24);

			if(hours > 0)
			{
				parts.push(hours + "h");
			}

			if(minutes > 0)
			{
				parts.push(minutes + "m");
			}
		}
		else if(total_hours > 0)
		{
			parts.push(total_hours + "h");

			if(minutes > 0)
			{
				parts.push(minutes + "m");
			}
		}
		else if(total_minutes > 0)
		{
			parts.push(minutes + "m");
		}
		else
		{
			parts.push(total_seconds + "s");
		}

		const idle = parts.join();
		const signon = new Date(parseInt(fields[5], 10) * 1000).toLocaleTimeString();
		const loginid = fields[6] + "@" + fields[7];
		const status = fields[8];

		return " " + flag + " " + nick.padEnd(16) + " " + idle.padEnd(8) + " " + signon + " " + loginid + " " + status;
	}

	function handle_ltd_message(msg)
	{
		switch(msg.type)
		{
			case "j":
				_onConnectionStateChanged(this, ConnectionState.CONNECTED);
				break;

			case "b":
				messageReceived({type: "open", from: msg.fields[0], text: msg.fields[1], timestamp: new Date()});
				break;

			case "c":
				messageReceived({type: "personal", sender: msg.fields[0], text: msg.fields[1], timestamp: new Date()});
				break;

			case "d":
				messageReceived({type: "status", category: msg.fields[0], text: msg.fields[1], timestamp: new Date()});
				break;

			case "e":
				messageReceived({type: "error", text: msg.fields[0], timestamp: new Date()});
				break;

			case "f":
				messageReceived({type: "wall", from: "WALL", text: msg.fields[1], timestamp: new Date()});
				break;

			case "i":
				if(msg.fields[0] === "co")
				{
					const regexp = /<\*to: ([^\s\.]+)\*> (.*)/g;
					const m = regexp.exec(msg.fields[1]);

					if(m)
					{
						const receiver = m[1];

						messageReceived({type: "personal", from: _nick, sender: receiver, text: m[2], timestamp: new Date()});
					}
					else
					{
						messageReceived({type: "output", text: msg.fields[1], timestamp: new Date()});
					}
				}
				else if(msg.fields[0] === "wl")
				{
					messageReceived({type: "output", text: format_wl(msg.fields), timestamp: new Date()});
				}
				break;
		}
	}

	function handle_session_message(msg)
	{
		if(msg.field)
		{
			_onSessionStateChanged(this, msg.field, msg.value);
		}
	}

	function handle_users_message(msg)
	{
		switch(msg.action)
		{
			case "add":
				_onUserAdded(this, msg.nick);
				break;

			case "remove":
				_onUserRemoved(this, msg.nick);
				break;

			case "clear":
				_onUsersRemoved(this);
				break;
		}
	}

	return Object.freeze(
	{
		connect: function(url)
		{
			_onConnectionStateChanged(this, ConnectionState.CONNECTING);

			try
			{
				_ws = new WebSocket(url);

				_ws.onopen = () =>
				{
					send({"type": "a", "fields": [_username, _nick, _group, "login", _password]});
				};

				_ws.onmessage = e =>
				{
					console.log(e.data);

					try
					{
						const msg = eval('(' + e.data + ')');

						switch(msg.kind)
						{
							case "ltd":
								handle_ltd_message(msg);
								break;

							case "session":
								handle_session_message(msg);
								break;

							case "users":
								handle_users_message(msg);
								break;
						}
					}
					catch(e)
					{
						console.log(e);
					}
				};

				_ws.onclose = () =>
				{
					_onConnectionStateChanged(this, ConnectionState.DISCONNECTED);
				};

				_ws.onerror = event =>
				{
					_onConnectionStateChanged(this, ConnectionState.DISCONNECTED);

					alert("Connection error.");
				};
			}
			catch(e)
			{
				_onConnectionStateChanged(this, ConnectionState.DISCONNECTED);
			}
		},
		sendCommand: function(text)
		{
			let fields = null;

			const offset = text.indexOf(' ');

			if(offset == -1)
			{
				if(text.length > 1)
				{
					fields = [text.substring(1), '\0']
				}
			}
			else if(offset > 1)
			{
				if(text.length > 1)
				{
					fields = [text.substring(1, offset), text.substring(offset + 1)];
				}
			}

			if(fields)
			{
				send({"type": "h", "fields": fields})
			}
		},
		sendOpen: function(text)
		{
			send({"type": "b", "fields": [text]});
		},
		sendPersonal: function(receiver, text)
		{
			send({"type": "h", "fields": ["m", receiver + " " + text]});
		},
		set onConnectionStateChanged(fn)
		{
			_onConnectionStateChanged = fn;
		},
		set onMessage(fn)
		{
			_onMessage = fn;
		},
		set onSessionStateChanged(fn)
		{
			_onSessionStateChanged = fn;
		},
		set onUserAdded(fn)
		{
			_onUserAdded = fn;
		},
		set onUserRemoved(fn)
		{
			_onUserRemoved = fn;
		},
		set onUsersRemoved(fn)
		{
			_onUsersRemoved = fn;
		}
	});
}
