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
import ssl
import json
import re
import log
import client
import ltd

from autobahn.asyncio.websocket import WebSocketServerProtocol, WebSocketServerFactory

class WSProtocol(WebSocketServerProtocol, client.StateListener):
    def __init__(self, logger, address, port):
        WebSocketServerProtocol.__init__(self)
        client.StateListener.__init__(self)

        self.__log = logger
        self.__address = address
        self.__port = port
        self.__peer = None

    def onConnect(self, request):
        self.__log.info("Client connecting: %s", request.peer)

        self.__peer = request.peer
        self.__client = None

    def onOpen(self):
        self.__log.info("Client connected successfully: %s", self.__peer)

    def onMessage(self, payload, isBinary):
        if not isBinary:
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
                self.__log.warning(e)
        else:
            self.__log.debug("Discarding binary message from %s.", self.__peer)

    async def __run_icb_client__(self, loginid, nick, group, password):
        self.__log.debug("Connecting to %s:%d.", self.__address, self.__port)

        self.__client = client.Client(self.__address, self.__port)

        self.__client.state.add_listener(self)

        connection_lost_f = await self.__client.connect()

        address = ""

        m = re.match(r"^tcp\d+:(.+):\d+$", self.peer)

        if m:
            address = m.group(1)

        self.__client.login(loginid, nick, group, password if password else "", address)

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

        self.__log.debug("Disconnected from %s:%d.", self.__address, self.__port)

        self.sendClose()

    def onClose(self, wasClean, code, reason):
        self.__log.info("Connection closed: %s", reason)

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
    logger = log.new_logger()

    logger.info("Starting websocket server: %s", m["url"])
    logger.info("Listen on: %s:%d", m["address"], m["port"])

    factory = WebSocketServerFactory(m["url"])
    factory.protocol = lambda: WSProtocol(logger, m["remote-address"], m["remote-port"])

    loop = asyncio.get_event_loop()

    sc = None

    if m["ssl-cert"] and m["ssl-key"]:
        sc = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)

        sc.load_cert_chain(m["ssl-cert"], m["ssl-key"])

    server = loop.create_server(factory, m["address"], m["port"], ssl=sc)

    loop.run_until_complete(server)

    loop.run_forever()

def print_usage():
    print("%s [options]" % sys.argv[0])
    print("  -U, --url              websocket url")
    print("  -L, --address          listen address")
    print("  -P, --port             listen port")
    print("  -s, --remote-address   ICB server address")
    print("  -p, --remote-port      ICB server port")
    print("  --ssl-cert             SSL certificate")
    print("  --ssl-key              private SSL key")
    print("  -h, --help             display this help and exit")

def get_opts(argv):
    options, _ = getopt.getopt(argv,
                               "hU:L:P:s:p:",
                               ["help", "url=", "address=", "port=", "remote-address=", "remote-port=", "ssl-cert=", "ssl-key="])

    m = {"url": "ws://localhost:7329",
         "address": "127.0.0.1",
         "port": 7329,
         "remote-address": "localhost",
         "remote-port": 7326,
         "ssl-cert": None,
         "ssl-key": None,
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
        elif opt in ("--ssl-cert",):
            m["ssl-cert"] = arg
        elif opt in ("--ssl-key",):
            m["ssl-key"] = arg

    return m

if __name__ == "__main__":
    m = get_opts(sys.argv[1:])

    if m["action"] == "run":
        run(m)
    else:
        print_usage()
