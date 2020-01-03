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

export const GUI = (function()
{
	let _onLoginFormChanged = function(sender, field, value) {}
	let _onLogin = function(sender) {}
	let _connectionState = ConnectionState.DISCONNECTED;
	let _onSelectChannel = function(sender, channelName) {}
	let _onCloseChannel = function(sender, channelName) {}
	let _onTextEntered = function(sender, text) {}
	let _isVisible = true;
	let _unread = 0;

	function showConnectingScreen(visible)
	{
		const connectingScreen = document.getElementsByClassName("screen-connecting")[0];

		if(visible)
		{
			connectingScreen.classList.remove("hidden");
		}
		else
		{
			connectingScreen.classList.add("hidden");
		}
	}

	function enableMessageInput(enabled)
	{
		const input = document.getElementById("message-input");

		input.disabled = !enabled;
		input.focus();
	}

	function updateConnectionStatus(connected)
	{
		const icon = document.getElementById("connection-status");
		const reconnectButton = document.getElementById("reconnect");

		if(connected)
		{
			icon.classList.remove("fa-unlink");
			icon.classList.add("fa-link");
			icon.title = "Connected to ICB \\o/";
			reconnectButton.style.display = "none";
		}
		else
		{
			icon.classList.remove("fa-link");
			icon.classList.add("fa-unlink");
			icon.title = "Disconnected from ICB :(";
			reconnectButton.style.display = "block";
		}
	}

	function atBottom()
	{
		const div = document.getElementById("msgout");

		return div.scrollHeight == (div.scrollTop + div.clientHeight);
	}

	function scrollToBottom()
	{
		const div = document.getElementById("messages-container");

		div.scrollTop = div.scrollHeight;
	}

	function linkify(text)
	{
		const urlRegex = /(\b((https?|ftp|file):\/\/|www\.)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

		return text.replace(urlRegex, url =>
		{
			if(url.startsWith("www."))
			{
				url = "http://" + url;
			}

			return '<a target="_blank" href="' + url + '">' + url + '</a>';
		});
	}

	function showUnreadMessage()
	{
		const regex = /(.*) \(\d+\)/ig;
		const m = regex.exec(document.title);

		if(m)
		{
			document.title = m[1] + ' (' + _unread + ')';
		}
		else
		{
			document.title += ' (' + _unread + ')';
		}
	}

	function hideUnreadMessage()
	{
		const regex = /(.*) \(\d+\)/ig;
		const m = regex.exec(document.title);

		if(m)
		{
			document.title = m[1];
		}
	}

	let input = document.getElementsByName("nickname")[0];

	input.addEventListener("keyup", event =>
	{
		_onLoginFormChanged(event.target, "nick", event.target.value);
	});

	input = document.getElementsByName("group")[0];

	input.addEventListener("keyup", event =>
	{
		_onLoginFormChanged(event.target, "group", event.target.value);
	});

	const button = document.getElementById("login-button");

	button.addEventListener("click", event =>
	{
		_onLogin(event.target);
	});

	input = document.getElementById("message-input");

	input.addEventListener("keyup", event =>
	{
		if(event.key === "Enter")
		{
			_onTextEntered(event.target, event.target.value);
			input.value = "";
		}
	});

	window.addEventListener("blur", event =>
	{
		_isVisible = false;
	});

	window.addEventListener("focus", event =>
	{
		_isVisible = true;
		_unread = 0;

		hideUnreadMessage();

		const input = document.getElementById("message-input");

		input.focus();
	});

	if(Notification.permission !== 'granted')
	{
		Notification.requestPermission();
	}

	return Object.freeze(
	{
		set loginForm(formData)
		{
			let input = document.getElementsByName("nickname")[0];

			input.value = formData.nick;

			input = document.getElementsByName("group")[0];

			input.value = formData.group;
		},
		set loginEnabled(enabled)
		{
			document.getElementById("login-button").disabled = !enabled;
		},
		showLogin: function()
		{
			document.getElementsByClassName("screen-blank")[0].classList.add("hidden");
		},
		showChat: function()
		{
			document.getElementsByClassName("screen-login")[0].classList.add("hidden");
		},
		set connectionState(state)
		{
			showConnectingScreen(state === ConnectionState.CONNECTING);
			updateConnectionStatus(state === ConnectionState.CONNECTED);
			enableMessageInput(state === ConnectionState.CONNECTED);
		},
		notify: function(title, text)
		{
			if(!_isVisible)
			{
				new Notification(title, {icon: "/images/notification.png", body: text});
			}
		},
		addChannel: function(channelName)
		{
			const li = document.createElement("li");

			li.classList.add("channel");
			li.setAttribute("data-channel-name", channelName);

			const span = document.createElement("span");

			span.innerText = channelName;

			span.classList.add("channel");

			span.onclick = function(e)
			{
				if(!this.parentNode.classList.contains("selected"))
				{
					_onSelectChannel(this, channelName);
				}
			}

			li.appendChild(span);

			if(channelName !== "open")
			{
				const i = document.createElement("i");

				i.classList.add("fa");
				i.classList.add("fa-window-close");
				i.classList.add("channel");
				i.classList.add("close");

				li.appendChild(i);

				i.onclick = function(e)
				{
					e.stopPropagation();

					_onCloseChannel(this, channelName);
				}
			}

			const ul = document.getElementById("channel-list");

			ul.appendChild(li);
		},
		removeChannel: function(channelName)
		{
			const ul = document.getElementById("channel-list");

			for(var li of ul.children)
			{
				const foundChannel = li.getAttribute("data-channel-name");

				if(foundChannel === channelName)
				{
					li.remove();

					break;
				}
			}
		},
		highlightChannel: function(channelName, highlighted)
		{
			const ul = document.getElementById("channel-list");

			for(var li of ul.children)
			{
				const foundChannel = li.getAttribute("data-channel-name");

				if(foundChannel === channelName)
				{
					if(highlighted)
					{
						li.classList.add("highlighted");
					}
					else
					{
						li.classList.remove("highlighted");
					}

					break;
				}
			}

		},
		set selectedChannel(channelName)
		{
			const ul = document.getElementById("channel-list");

			for(var li of ul.children)
			{
				const foundChannel = li.getAttribute("data-channel-name");

				if(foundChannel === channelName)
				{
					li.classList.add("selected");
				}
				else
				{
					li.classList.remove("selected");
				}
			}
		},
		set title(title)
		{
			const div = document.getElementsByClassName("header")[0];

			div.innerText = title || "Internet CB Network";
		},
		set group(groupName)
		{
			const li = document.getElementById("channel-list").children[0];

			if(li)
			{
				li.children[0].innerText = groupName || "open";
			}
		},
		set nick(nick)
		{
			const span = document.getElementById("nick");

			if(span)
			{
				span.innerText = nick;
			}
		},
		writeMessage: function(message)
		{
			const autoScroll = atBottom();
			const table = document.getElementById("messages");
			const row = table.insertRow(-1);
			var cell = row.insertCell(0);

			const prepend0 = function(val)
			{
				return (val < 10 ? "0" : "") + val;
			}

			cell.className = "msg timestamp";
			cell.innerText = prepend0(message.timestamp.getHours()) +
			                 ":" +
			                 prepend0(message.timestamp.getMinutes()) +
			                 ":" +
			                 prepend0(message.timestamp.getSeconds());

			cell = row.insertCell(1);
			cell.className = "msg from " + message.type;

			if(message.category)
			{
				cell.innerHTML = message.category;
			}
			else if(message.from)
			{
				cell.innerHTML = message.from;
			}
			else if(message.sender)
			{
				cell.innerHTML = message.sender;
			}

			cell = row.insertCell(2);

			cell.className = "msg " + message.type;
			cell.innerText = message.text;
			cell.innerHTML = linkify(cell.innerHTML);

			if(message.type === "open" || message.type === "personal")
			{
				emojify.run(cell);
			}

			if(autoScroll)
			{
				scrollToBottom();
			}

			if(!_isVisible)
			{
				if(message.type === "open" || message.type === "personal" || message.type === "wall")
				{
					++_unread;

					showUnreadMessage();
				}
			}
		},
		clearMessages: function()
		{
			document.getElementById("messages").innerHTML = '<tbody></tbody>';
		},
		set users(users)
		{
			const ul = document.getElementById("userlist");

			while(ul.firstChild)
			{
				ul.removeChild(ul.firstChild);
			}

			users.forEach(nick =>
			{
				const li = document.createElement("li");

				li.classList.add("user");
				li.innerText = nick;

				ul.appendChild(li);
			});
		},
		set userListVisible(visible)
		{
			const div = document.getElementById("users-container");

			if(visible)
			{
				div.classList.remove("hidden");
			}
			else
			{
				div.classList.add("hidden");
			}
		},
		set onLoginFormChanged(fn)
		{
			_onLoginFormChanged = fn;
		},
		set onLogin(fn)
		{
			_onLogin = fn;
		},
		set onSelectChannel(fn)
		{
			_onSelectChannel = fn;
		},
		set onCloseChannel(fn)
		{
			_onCloseChannel = fn;
		},
		set onTextEntered(fn)
		{
			_onTextEntered = fn;
		}
	});
})()
