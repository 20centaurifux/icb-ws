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
import traceback
import random
import client
import json
import ltd

from autobahn.asyncio.websocket import WebSocketServerProtocol, WebSocketServerFactory

class WSProtocol(WebSocketServerProtocol, client.ModelListener):
    def __init__(self):
        WebSocketServerProtocol.__init__(self)
        client.ModelListener.__init__(self)

    def onConnect(self, request):
        print("Client connecting: {0}".format(request.peer))

        self.__client = None

    def onOpen(self):
        print("WebSocket connection open.")

    def onMessage(self, payload, isBinary):
        if isBinary:
            return

        try:
            msg = self.__read_message__(payload)

            if msg["type"] == "a" and not self.__client:
                loginid, nick, group = msg["fields"][:3]
                password = msg["fields"][4] if len(msg["fields"]) >= 5 else ""

                asyncio.create_task(self.__run_icb_client__(loginid, nick, group, password))
            else:
                e = ltd.Encoder(msg["type"])

                for f in msg["fields"]:
                    e.add_field_str(f)

                self.__client.send(e.encode())
        except Exception as e:
            print(e)

    async def __run_icb_client__(self, loginid, nick, group, password):
        self.__client = client.Client("127.0.0.1", 7326)

        self.__client.model.add_listener(self)

        connection_lost_f = await self.__client.connect()

        self.__client.login(loginid, nick, group, password if password else "")

        msg_f = asyncio.ensure_future(self.__client.read())

        self.__client.command("echoback", "verbose", None)

        running = True

        while running:
            done, _ = await asyncio.wait([msg_f, connection_lost_f], return_when=asyncio.FIRST_COMPLETED)

            for task in done:
                if task is msg_f:
                    t, f = task.result()

                    self.__send_message__({"kind": "ltd", "type": t, "fields": f})

                    msg_f = asyncio.ensure_future(self.__client.read())
                elif task is connection_lost_f:
                    running = False

        self.sendClose()

    def onClose(self, wasClean, code, reason):
        print("WebSocket connection closed: {0}".format(reason))

        if self.__client:
            self.__client.quit()

    def __read_message__(self, payload):
        text = payload.decode("utf-8")

        return json.loads(text)

    def __send_message__(self, m):
        self.sendMessage(json.dumps(m).encode("utf-8"), False)

    def changed(self, name, old, new):
        self.__send_message__({"kind": "session", "field": name, "value": new})

    def members_removed(self):
        self.__send_message__({"kind": "users", "action": "clear"})

    def member_added(self, nick):
        self.__send_message__({"kind": "users", "action": "add", "nick": nick})

    def member_removed(self, nick):
        self.__send_message__({"kind": "users", "action": "renive", "nick": nick})

if __name__ == "__main__":
    factory = WebSocketServerFactory(u"ws://127.0.0.1:9000")
    factory.protocol = WSProtocol

    loop = asyncio.get_event_loop()
    coro = loop.create_server(factory, '0.0.0.0', 9000)
    server = loop.run_until_complete(coro)

    loop.run_forever()
