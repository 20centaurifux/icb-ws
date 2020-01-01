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
import sys
import getopt
import asyncio
import json
import client
import ltd

from autobahn.asyncio.websocket import WebSocketServerProtocol, WebSocketServerFactory

class WSProtocol(WebSocketServerProtocol, client.StateListener):
    def __init__(self, address, port):
        WebSocketServerProtocol.__init__(self)
        client.StateListener.__init__(self)

        self.__address = address
        self.__port = port

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
        self.__client = client.Client(self.__address, self.__port)

        self.__client.state.add_listener(self)

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
        self.__send_message__({"kind": "users", "action": "remove", "nick": nick})

def run(m):
    factory = WebSocketServerFactory(m["url"])
    factory.protocol = lambda: WSProtocol(m["remote-address"], m["remote-port"])

    loop = asyncio.get_event_loop()

    server = loop.create_server(factory, m["address"], m["port"])

    loop.run_until_complete(server)

    loop.run_forever()

def print_usage():
    print("%s [options]" % sys.argv[0])
    print("  -U, --url              websocket url")
    print("  -L, --address          listen address")
    print("  -P, --port             listen port")
    print("  -s, --remote-address   ICB server address")
    print("  -p, --remote-port      ICB server port")
    print("  -h, --help             display this help and exit")

def get_opts(argv):
    options, _ = getopt.getopt(argv, "hU:L:P:s:p:", ["help", "url=", "address=", "port=", "remote-address=", "remote-port="])

    m = {"url": "ws://localhost:7329",
         "address": "127.0.0.1",
         "port": 7329,
         "remote-address": "localhost",
         "remote-port": 7326,
         "action": "run"}

    for opt, arg in options:
        if opt in ("-h", "--help"):
            m["action"] = "help"
        elif opt in ("-U", "--url"):
            m["url"] = arg
        elif opt in ("-L", "--address"):
            m["address"] = arg
        elif opt in ("-P", "--port"):
            m["port"] = int(arg)
        if opt in ("-s", "--remote-address"):
            m["remote-address"] = arg
        elif opt in ("-p", "--remote-port"):
            m["remote-port"] = int(arg)

    return m

if __name__ == "__main__":
    m = get_opts(sys.argv[1:])

    if m["action"] == "run":
        run(m)
    else:
        print_usage()
