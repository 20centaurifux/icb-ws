"""
    project............: icb-ws
    description........: HTML5 front-end for ICB
    date...............: 12/2019
    copyright..........: Sebastian Fedrau

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
"""
import asyncio
import ltd
import re

class ICBClientProtocol(asyncio.Protocol):
    def __init__(self, on_conn_lost, queue):
        self.__on_conn_lost = on_conn_lost
        self.__transport = None
        self.__decoder = ltd.Decoder()
        self.__decoder.add_listener(self.__message_received__)
        self.__queue = queue

    def connection_made(self, transport):
        self.__transport = transport

    def data_received(self, data):
        try:
            self.__decoder.write(data)

        except Exception as ex:
            self.__shutdown__(ex)

    def connection_lost(self, ex):
        self.__shutdown__(ex)

    def __shutdown__(self, ex=None):
        self.__on_conn_lost.set_result(ex)

    def __message_received__(self, type_id, payload):
        self.__queue.put_nowait((type_id, payload))

class ModelListener:
    def changed(self, name, old, new):
        pass

    def members_removed(self):
        pass

    def member_added(self, nick):
        pass

    def member_removed(self, nick):
        pass

class Model:
    def __init__(self):
        self.__nick = None
        self.__registered = False
        self.__group = None
        self.__group_status = None
        self.__moderator = None
        self.__topic = None
        self.__members = set()
        self.__listeners = set()

    @property
    def nick(self):
        return self.__nick

    @nick.setter
    def nick(self, value):
        self.__change__("_Model__nick", value)

    @property
    def registered(self):
        return self.__registered

    @registered.setter
    def registered(self, value):
        self.__change__("_Model__registered", value)

    @property
    def group(self):
        return self.__group

    @group.setter
    def group(self, value):
        self.__change__("_Model__group", value)

    @property
    def group_status(self):
        return self.__group_status

    @group_status.setter
    def group_status(self, value):
        self.__change__("_Model__group_status", value)

    @property
    def moderator(self):
        return self.__moderator

    @moderator.setter
    def moderator(self, value):
        self.__change__("_Model__moderator", value)

    @property
    def topic(self):
        return self.__topic

    @topic.setter
    def topic(self, value):
        self.__change__("_Model__topic", value)

    def __change__(self, attr, v):
        old = getattr(self, attr)

        if old != v:
            setattr(self, attr, v)

            for l in self.__listeners:
                l.changed(attr[8:], old, v)

    def remove_all_members(self):
        if self.__members:
            self.__members.clear()

            for l in self.__listeners:
                l.members_removed()

    def add_member(self, nick):
        if not nick in self.__members:
            self.__members.add(nick)

            for l in self.__listeners:
                l.member_added(nick)

    def remove_member(self, nick):
        if nick in self.__members:
            self.__members.remove(nick)

            for l in self.__listeners:
                l.member_removed(nick)

    def add_listener(self, l):
        self.__listeners.add(l)

    def remove_listener(self, l):
        self.__listeners.remove(l)

class Client:
    def __init__(self, host, port):
        self.__host = host
        self.__port = port
        self.messageq = asyncio.Queue()
        self.__transport = None
        self.__model = Model()

    @property
    def model(self):
        return self.__model

    async def connect(self):
        loop = asyncio.get_event_loop()

        on_conn_lost = loop.create_future()

        self.__transport, _ = await loop.create_connection(lambda: ICBClientProtocol(on_conn_lost, self.messageq),
                                                           self.__host,
                                                           self.__port)

        return on_conn_lost

    def login(self, loginid, nick, group="", password=""):
        e = ltd.Encoder("a")

        e.add_field_str(loginid)
        e.add_field_str(nick)
        e.add_field_str(group)
        e.add_field_str("login")
        e.add_field_str(password)

        self.__transport.write(e.encode())

        self.__nick = nick

    def open_message(self, text):
        self.__transport.write(ltd.encode_str("b", text.strip()))

    def command(self, command, arg, msgid):
        e = ltd.Encoder("h")

        e.add_field_str(command)
        e.add_field_str(arg if not arg is None else "")
        e.add_field_str(msgid if not msgid is None else "")

        self.__transport.write(e.encode())

    def send(self, msg):
        self.__transport.write(msg)

    def pong(self):
        self.__transport.write(ltd.encode_empty_cmd("m"))

    def quit(self):
        self.__transport.close()

    async def read(self):
        t, p = await self.messageq.get()

        fields = [f.decode("UTF-8").strip("\0") for f in ltd.split(p)]

        self.__process_message__(t, fields)

        return t, fields

    def __process_message__(self, t, fields):
        if t == "l":
            self.pong()
        elif t == "d" and len(fields) == 2:
            if fields[0] == "Status":
                m = re.match("You are now in group ([^\s\.]+)", fields[1])

                if m:
                    self.__model.group = m.group(1)
                    self.__model.remove_all_members()

                    self.command("w", ".", "1")
            elif fields[0] == "Name":
                m = re.match("([^\s\.]+) changed nickname to ([^\s\.]+)", fields[1])

                if m:
                    nick = m.group(1)

                    if nick == self.__nick:
                        self.__model.nick = m.group(2)
                        self.__model.registered = False
            elif fields[0] == "Topic":
                m = re.match(".* changed the topic to \"(.+)\"", fields[1])

                if m:
                    self.__model.topic = m.group(1)
            elif fields[0] == "Sign-on" or fields[0] == "Arrive":
                parts = fields[1].split(" ")

                if(parts):
                    self.__model.add_member(parts[0])
            elif fields[0] == "Sign-off" or fields[0] == "Depart":
                if fields[1].startswith("Your moderator"):
                    self.__model.remove_member(self.__model.moderator)
                    self.__model.moderator = None
                else:
                    parts = fields[1].split(" ")

                    if parts:
                        self.__model.remove_member(parts[0])
            elif fields[0] == "Pass":
                parts = fields[1].split(" ")

                if(parts):
                    self.__model.moderator = parts[0]
            elif fields[0] == "Register" and fields[1].startswith("Nick registered"):
                self.__model.registered = True
        elif t == "i" and len(fields) >= 3:
            if fields[0] == "co" and fields[2] == "1":
                m = re.match("Group: ([^\s\.]+)\s+\((\w{3})\) Mod: ([^\s\.]+)\s+Topic: (.*)", fields[1])

                if m:
                    self.__model.group_status = m.group(2)
                    self.__model.moderator = m.group(3) if m.group(3) != "(None)" else None
                    self.__model.topic = m.group(4) if m.group(4) != "(None)" else None
            elif fields[0] == "wl":
                self.__model.add_member(fields[2])
        elif t == "g":
            self.quit()
