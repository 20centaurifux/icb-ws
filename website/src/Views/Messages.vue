<template>
    <div class="container" v-show="visible">
      <div ref="viewport" class="lines" @scroll="handleScrolling">
        <table>
          <tbody>
            <tr v-for="(message, i) in messages" :key="i">
              <td class="message timestamp">{{message.timestamp}}</td>
              <td :class="'message from ' + message.type">{{message.sender}}</td>
              <td :class="'message ' + message.type">
                <text-line :text="message.text"
                           linkify="true"
                           :emojify="message.type === 'open' || message.type === 'personal'">
                </text-line>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="users">
        <user-list :users="users" :moderator="moderator"></user-list>
      </div>
    </div>
</template>

<script>
import Vue from 'vue'
import UserList from './UserList.vue'
import Line from './Line.vue'

export default {
  components: {
    'user-list': UserList,
    'text-line': Line
  },
  props: ['messages', 'visible', 'users', 'moderator'],
  data: function () {
    return {
      atBottom: true
    }
  },
  methods: {
    scrollToBottom: function () {
      if (this.atBottom) {
        const div = this.$refs.viewport

        div.scrollTop = div.scrollHeight - div.clientHeight
      }
    },
    handleScrolling: function () {
      const div = this.$refs.viewport

      this.atBottom = (div.scrollHeight <= (div.scrollTop + div.clientHeight))
    },
  },
  watch: {
    visible: function (value) {
      if (value) {
        Vue.nextTick(() => this.scrollToBottom())
      }
    },
    messages: function (value) {
      Vue.nextTick(() => this.scrollToBottom())
    }
  }
}
</script>

<style>
.container
{
  display:flex;
  flex-grow:1;
  overflow:hidden;
  border-right:1px solid #c2c2c2;
  width:100%;
  padding-left:3px;
}

.lines
{
  font-family:Courier, monospace;
  flex-grow:1;
  overflow:auto;
  border-right:black solid 1px;
}

.users
{
  min-width:200px;
  background-color:#102027;
  color:white;
  padding:3px;
}

td.message
{
  vertical-align:middle;
  line-height:20px;
  font-size:16px;
  white-space:pre-wrap;
}

td.message.timestamp
{
  color:#1e2b37;
  padding-right:5px;
}

td.message.from
{
  color:#2384c6;
  text-align:right;
  padding-right:5px;
}

td.message.from.status
{
  color:#128f76;
}

td.message.from.error
{
  color:#d62c1a
}

td.message.open
{
  color:#1e2b37;
}

td.msg.status
{
  color:#149a80;
}

td.message.wall
{
  color:#149a80;
  font-weight:bold;
}

td.message.error
{
  color:#e12e1c;
}

td.message.output
{
  color:#393939
}
</style>
