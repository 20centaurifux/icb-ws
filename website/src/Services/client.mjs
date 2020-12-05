import { ConnectionState } from './core.mjs'

/* eslint-disable accessor-pairs, no-eval */

export function Client (loginid, nick, password, group) {
  const _loginid = loginid
  const _password = password
  let _nick = nick
  let _group = group

  let _onConnectionStateChanged = function (sender, state) {}
  let _onMessage = function (sender, message) {}
  let _onSessionStateChanged = function (sender, field, value) {}
  let _onUserAdded = function (sender, nick) {}
  let _onUserRemoved = function (sender, nick) {}
  let _onUsersRemoved = function (sender) {}
  let _ws

  function messageReceived (message) {
    _onMessage(this, message)
  }

  function send (json) {
    const msg = JSON.stringify(json)

    _ws.send(msg)
  }

  function formatWl (fields) {
    let flag = ' '
    const nick = fields[2]
    const totalSeconds = parseInt(fields[3], 10)
    const totalMinutes = Math.round(totalSeconds / 60)
    const totalHours = Math.round(totalMinutes / 60)
    const minutes = totalMinutes - (totalHours * 60)
    const parts = []

    if (fields[1] !== ' ') {
      flag = '*'
    }

    if (totalHours > 23) {
      const days = Math.round(totalHours / 24)

      parts.push(days + 'd')

      const hours = totalHours - (days * 24)

      if (hours > 0) {
        parts.push(hours + 'h')
      }

      if (minutes > 0) {
        parts.push(minutes + 'm')
      }
    } else if (totalHours > 0) {
      parts.push(totalHours + 'h')

      if (minutes > 0) {
        parts.push(minutes + 'm')
      }
    } else if (totalMinutes > 0) {
      parts.push(minutes + 'm')
    } else {
      parts.push(totalSeconds + 's')
    }

    const idle = parts.join()
    const signon = new Date(parseInt(fields[5], 10) * 1000).toLocaleTimeString()
    const loginid = fields[6] + '@' + fields[7]
    const status = fields[8]

    return ' ' + flag + ' ' + nick.padEnd(16) + ' ' + idle.padEnd(8) + ' ' + signon + ' ' + loginid + ' ' + status
  }

  function handleLtdMessage (msg) {
    switch (msg.type) {
      case 'j':
        _onConnectionStateChanged(this, ConnectionState.CONNECTED)
        break

      case 'b':
        messageReceived({ type: 'open', from: msg.fields[0], text: msg.fields[1], timestamp: new Date() })
        break

      case 'c':
        messageReceived({ type: 'personal', sender: msg.fields[0], text: msg.fields[1], timestamp: new Date() })
        break

      case 'd':
        messageReceived({ type: 'status', category: msg.fields[0], text: msg.fields[1], timestamp: new Date() })
        break

      case 'e':
        messageReceived({ type: 'error', text: msg.fields[0], timestamp: new Date() })
        break

      case 'f':
        messageReceived({ type: 'wall', from: 'WALL', text: msg.fields[1], timestamp: new Date() })
        break

      case 'i':
        if (msg.fields[0] === 'co') {
          const regexp = /<\*to: ([^\s.]+)\*> (.*)/g
          const m = regexp.exec(msg.fields[1])

          if (m) {
            const receiver = m[1]

            messageReceived({ type: 'personal', from: _nick, to: receiver, text: m[2], timestamp: new Date() })
          } else {
            messageReceived({ type: 'output', text: msg.fields[1], timestamp: new Date() })
          }
        } else if (msg.fields[0] === 'wl') {
          messageReceived({ type: 'output', text: formatWl(msg.fields), timestamp: new Date() })
        }
        break
    }
  }

  function handleSessionMessage (msg) {
    if (msg.field) {
      if (msg.field === 'nick') {
        _nick = msg.value
      } else if (msg.field === 'group') {
        _group = msg.value
      }

      _onSessionStateChanged(this, msg.field, msg.value)
    }
  }

  function handleUserMessage (msg) {
    if (msg.action === 'add') {
      _onUserAdded(this, msg.nick)
    } else if (msg.action === 'remove') {
      _onUserRemoved(this, msg.nick)
    } else if (msg.action === 'clear') {
      _onUsersRemoved(this)
    }
  }

  return Object.freeze({
    connect: function (url) {
      _onConnectionStateChanged(this, ConnectionState.CONNECTING)

      try {
        _ws = new WebSocket(url)

        _ws.onopen = () => {
          send({ type: 'a', fields: [_loginid, _nick, _group, 'login', _password] })
        }

        _ws.onmessage = e => {
          try {
            const msg = eval('(' + e.data + ')')

            if (msg.kind === 'ltd') {
              handleLtdMessage(msg)
            } else if (msg.kind === 'session') {
              handleSessionMessage(msg)
            } else if (msg.kind === 'users') {
              handleUserMessage(msg)
            }
          } catch (e) {
            console.warn(e)
          }
        }

        _ws.onclose = () => {
          _onConnectionStateChanged(this, ConnectionState.DISCONNECTED)
        }

        _ws.onerror = event => {
          _onConnectionStateChanged(this, ConnectionState.DISCONNECTED)
        }
      } catch (e) {
        _onConnectionStateChanged(this, ConnectionState.DISCONNECTED)
      }
    },
    sendCommand: function (text) {
      let fields = null

      const offset = text.indexOf(' ')

      if (offset === -1) {
        if (text.length > 1) {
          fields = [text.substring(1), '\0']
        }
      } else if (offset > 1) {
        if (text.length > 1) {
          fields = [text.substring(1, offset), text.substring(offset + 1)]
        }
      }

      if (fields) {
        send({ type: 'h', fields: fields })
      }
    },
    sendOpen: function (text) {
      send({ type: 'b', fields: [text] })
    },
    sendPersonal: function (receiver, text) {
      send({ type: 'h', fields: ['m', receiver + ' ' + text] })
    },
    set onConnectionStateChanged (fn) {
      _onConnectionStateChanged = fn
    },
    set onMessage (fn) {
      _onMessage = fn
    },
    set onSessionStateChanged (fn) {
      _onSessionStateChanged = fn
    },
    set onUserAdded (fn) {
      _onUserAdded = fn
    },
    set onUserRemoved (fn) {
      _onUserRemoved = fn
    },
    set onUsersRemoved (fn) {
      _onUsersRemoved = fn
    }
  })
}
