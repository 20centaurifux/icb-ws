<template>
<div id="page">
  <div id="overlay" v-if="!isConnected" />

  <div class="centered" v-if="isConnecting">
    <font-awesome-icon icon="spinner" size="2x" pulse />

    <div style="padding:15px;">
      Connecting to Internet CB Network...
    </div>
  </div>

  <div class="centered" v-if="isDisconnected">
    <div class="dialog">
      <div style="float:left;">
        <font-awesome-icon icon="unlink" size="4x" />
      </div>

     <div style="float:left; padding:15px; width:300px;">
        Ooooops... something went wrong. Please open <router-link to="/">login page</router-link> and try again.
     </div>
    </div>
  </div>

  <div id="chat">
    <div id="header">
      <div style="flex-grow:1">Internet CB Network</div>
      <div v-if="topic">{{ topic }}</div>
    </div>

    <channel-list :channels="channels"
                  @click="selectChannel"
                  @close="closeChannel">
    </channel-list>

    <messages v-for="(channel, i) in channels"
              :visible="channel === selectedChannel"
              :key="'messages-' + i"
              :messages="channel.messages"
              :users="channel.users"
              :moderator="channel.moderator">
    </messages>

    <input-box v-for="(channel, i) in channels"
               :key="'input-' + i"
               :visible="channel === selectedChannel"
               :nickname="nickname"
               v-model="channel.text"
               @send="sendMessage(channel)">
    </input-box>
  </div>
</div>
</template>

<script>
import Vue from 'vue'
import { ConnectionState } from '../Services/core.mjs'
import { RXClient } from '../Services/client.rx.mjs'
import { map, tap, filter } from 'rxjs/operators'
import { Config } from '../config.mjs'
import ChannelList from './ChannelList.vue'
import Messages from './Messages.vue'
import Input from './Input.vue'

export default {
  components: {
    'channel-list': ChannelList,
    messages: Messages,
    'input-box': Input
  },
  data () {
    return {
      client: RXClient,
      state: ConnectionState.UNDEFINED,
      nickname: '',
      channels: [],
      selectedChannel: null,
      topic: '',
      unread: 0
    }
  },
  mounted: function () {
    const credentials = this.$route.params.credentials

    if (credentials) {
      this.nickname = credentials.nickname

      const channel = this.selectedChannel = {
        name: '...',
        selected: true,
        highlight: false,
        messages: [],
        users: [],
        moderator: '',
        text: ''
      }

      this.channels.push(channel)
      this.selectedChannel = channel

      this.client = new RXClient(Config.loginid, credentials.nickname, credentials.password, credentials.group)

      this.client.connection
        .subscribe(newState => (this.state = newState))

      this.client.session
        .subscribe(newState => this.updateSession(newState.field, newState.value))

      const filteredMessages = this.client.messages
        .pipe(
          filter(this.acceptMessage))

      filteredMessages
        .pipe(
          map(this.messageToViewModel),
          tap(this.appendMessageToChannel))
        .subscribe()

      filteredMessages
        .pipe(
          filter(_ => this.$store.state.windowState === 'hidden'),
          tap(this.notifyMessage),
          tap(this.incrementUnreadMessages))
        .subscribe()

      this.client.users
        .pipe(
          filter(action => action.action === 'add'),
          tap(action => channel.users.push(action.nick)))
        .subscribe()

      this.client.users
        .pipe(
          filter(action => action.action === 'remove'),
          tap(action => {
            if (action.nick === '*') {
              channel.users.splice(0, channel.users.length)
            } else {
              const index = channel.users.indexOf(action.nick)

              if (index !== -1) {
                channel.users.splice(index, 1)
              }
            }
          }))
        .subscribe()

      this.client.connect(Config.url)
    } else {
      this.$router.replace({ name: 'root' })
    }
  },
  computed: {
    isConnecting: function () {
      return this.state === ConnectionState.CONNECTING
    },
    isConnected: function () {
      return this.state === ConnectionState.CONNECTED
    },
    isDisconnected: function () {
      return this.state === ConnectionState.DISCONNECTED
    }
  },
  methods: {
    updateSession: function (field, value) {
      let props = null

      if (field === 'nick') {
        this.nickname = value
      } else if (field === 'group') {
        props = { name: value }
      } else if (field === 'group_status') {
        props = { status: value }
      } else if (field === 'moderator') {
        props = { moderator: value }
      } else if (field === 'topic') {
        this.topic = value
      } else {
        console.warn('Unexpected session field: ' + field)
      }

      if (props) {
        this.$set(this.channels, 0, Object.assign(this.channels[0], props))
      }
    },
    acceptMessage: function (msg) {
      let bypass = false

      if (msg.type === 'personal' && (msg.sender === this.nickname || msg.from === this.nickname)) {
        bypass = (msg.to === undefined || msg.to === this.nickname)
      }

      return !bypass
    },
    appendMessageToChannel: function (msg) {
      let channelName = ''

      let autoSelect = false

      if (msg.type === 'personal') {
        autoSelect = (msg.sender === this.nickname)

        channelName = msg.to

        if (!channelName) {
          channelName = msg.sender
        }

        channelName = '@' + channelName
      }

      const channel = this.touchChannel(channelName)

      channel.messages.push(msg)

      if (autoSelect) {
        this.selectChannel(channel)
      }
    },
    touchChannel: function (name) {
      let channel = this.channels[0]

      if (name.startsWith('@')) {
        channel = this.channels.find(e => e.name === name)
      }

      if (channel) {
        channel.highlight = (channel !== this.selectedChannel)
      } else {
        channel = {
          name: name,
          status: '',
          highlight: true,
          selected: false,
          messages: [],
          users: [this.nickname, name.substring(1)],
          moderator: '',
          text: ''
        }

        this.channels.push(channel)
      }

      return channel
    },
    notifyMessage: function (msg) {
      if (msg.type === 'personal') {
        this.notify(msg.sender, msg.text)
      } else if (msg.type === 'open') {
        const regex = new RegExp('\\b' + this.nickname + '\\b')

        if (regex.test(msg.text)) {
          this.notify(msg.sender, msg.text)
        }
      } else if (msg.type === 'wall') {
        this.notify('WALL', msg.text)
      } else if (msg.type === 'status') {
        if (['Sign-on', 'Sign-off', 'Notify-On', 'Notify-Off'].includes(msg.category)) {
          this.notify(msg.category, msg.text)
        }
      }
    },
    notify: function (sender, text) {
      new Notification(sender || 'Internet CB Network', { icon: '/images/notification.png', body: text })
    },
    incrementUnreadMessages: function (msg) {
      if (['personal', 'open', 'wall', 'status'].includes(msg.type)) {
        ++this.unread

        document.title = 'Internet CB Network (' + this.unread + ')'
      }
    },
    selectChannel: function (channel) {
      this.selectedChannel = channel

      this.channels.forEach(c => (c.selected = (c === channel)))

      channel.highlight = false
    },
    closeChannel: function (channel) {
      const at = this.channels.indexOf(channel)

      this.channels.splice(at, 1)

      if (channel.selected) {
        this.channels[0].selected = true
        this.selectedChannel = this.channels[0]
      }
    },
    messageToViewModel: function (msg) {
      const vm = {}
      const pZ = n => (n < 10 ? '0' : '') + n

      vm.type = msg.type
      vm.timestamp = pZ(msg.timestamp.getHours()) + ':' +
        pZ(msg.timestamp.getMinutes()) + ':' +
        pZ(msg.timestamp.getSeconds())

      if (msg.category) {
        vm.sender = msg.category
      } else if (msg.from) {
        vm.sender = msg.from
      } else if (msg.sender) {
        vm.sender = msg.sender
      } else {
        vm.sender = ''
      }

      if (msg.to) {
        vm.to = msg.to
      }

      vm.text = msg.text

      return vm
    },
    sendMessage: function (channel) {
      if (channel.text.trim().length > 0) {
        if (channel.text[0] === '/') {
          this.client.sendCommand(channel.text)
        } else if (channel === this.channels[0]) {
          this.client.sendOpen(channel.text)
        } else {
          this.client.sendPersonal(channel.name.substring(1), channel.text)
        }

        channel.text = ''
      }
    }
  },
  watch: {
    '$store.state.windowState': function (value) {
      if (value === 'visible') {
        Vue.nextTick(() => (document.title = 'Internet CB Network'))

        this.unread = 0
      }
    }
  }
}
</script>

<style scoped>
#overlay {
  display:flex;
  align-items:center;
  justify-content:center;
  position:fixed;
  width:100%;
  height:100%;
  background-color:black;
  opacity:0.3;
  color:white;
}

div.centered
{
  display:flex;
  align-items:center;
  justify-content: center;
  position:fixed;
  width:100%;
  height:100%;
}

div.dialog
{
  background-color:white;
  padding:20px;
  border-radius:5px;
  width:400px;
  color:black;
}

#page {
  position:absolute;
  height:100%;
  width:100%;
}

#chat {
  display:flex;
  flex-flow:column;
  height:100%;
}

#header {
  display:flex;
  flex-shrink:0;
  align-items:center;
  overflow:hidden;
  background-color:#2C3E50;
  background-image: linear-gradient(to bottom, #2C3E50, #1a252f);
  color:white;
  height:45px;
  padding:3px;
}
</style>
