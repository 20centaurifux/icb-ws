import { Subject } from 'rxjs';
import { Client } from './client.mjs';

export function RXClient(loginid, nick, password, group) {
  const _connectionStateSubject = new Subject();
  const _sessionStateSubject = new Subject();
  const _messageSubject = new Subject();
  const _usersSubject = new Subject();

  const _client = new Client(loginid, nick, password, group);

  _client.onConnectionStateChanged = (_, state) => _connectionStateSubject.next(state);
  _client.onSessionStateChanged = (_, field, value) => _sessionStateSubject.next({ field, value: value });
  _client.onMessage = (_, message) => _messageSubject.next(message);
  _client.onUserAdded = (_, nick) => _usersSubject.next({ action: 'add', nick });
  _client.onUserRemoved = (_, nick) => _usersSubject.next({ action: 'remove', nick });
  _client.onUsersRemoved = (_, nick) => _usersSubject.next({ action: 'remove', nick: '*' });

  return Object.freeze({
    connect: function (url) {
      _client.connect(url);
    },
    connection: _connectionStateSubject,
    session: _sessionStateSubject,
    messages: _messageSubject,
    users: _usersSubject,
    sendCommand: function (text) {
      _client.sendCommand(text);
    },
    sendOpen: function (text) {
      _client.sendOpen(text);
    },
    sendPersonal: function (receiver, text) {
      _client.sendPersonal(receiver, text);
    }
  });
}
