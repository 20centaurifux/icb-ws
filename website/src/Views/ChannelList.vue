<template>
<div ref="container" id="container">
  <div ref="channelList"
       id="channelList"
       @mousedown="handleMouseDown"
       @mouseup="handleMouseUp"
       @mousemove="handleMouseMove"
       @mouseleave="handleMouseLeave">
    <ul id="channels">
      <li v-for="(channel, i) in channels"
          :key="i"
          :class="{ channel: true, selected: channel.selected, highlighted: channel.highlight }">
        <div class="title">
          <span class="text" @click="$emit('click', channel)">
            {{ channel.name }} <span v-if="channel.status">({{ channel.status }})</span>
          </span>
          <font-awesome-icon v-if="i" icon="window-close" @click="$emit('close', channel)" />
        </div>
      </li>
    </ul>
  </div>
</div>
</template>

<script>
export default {
  props: ['channels'],
  data: function () {
    return {
      startX: 0,
      startMargin: 0,
      dragging: false,
      margin: 0
    }
  },
  methods: {
    handleMouseDown: function (e) {
      this.startX = e.clientX
      this.startMargin = this.margin
      this.dragging = true
    },
    handleMouseUp: function (e) {
      this.startMargin = this.margin
      this.dragging = false
    },
    handleMouseMove: function (e) {
      if (this.dragging) {
        const offsetX = e.clientX - this.startX

        const newMargin = Math.min(this.startMargin + offsetX, 0)

        if (newMargin > this.margin || this.$refs.container.scrollWidth - this.$refs.container.offsetWidth > 0) {
          this.margin = newMargin
        }

        this.$refs.channelList.style.marginLeft = this.margin + 'px'
      }
    },
    handleMouseLeave: function () {
      if (this.dragging) {
        this.startMargin = this.margin
        this.dragging = false
      }
    }
  }
}
</script>

<style scoped>
#container
{
  width:100%;
  border-bottom:1px solid #c2c2c2;
  user-select:none;
}

#channelList
{
  position:relative;
  margin-left:0px;
}

#channels
{
  list-style-type:none;
  display:table-row;
}

.title
{
  display:flex;
  align-items:center;
}

.text
{
  padding:3px;
}

li.channel
{
  display:table-cell;
  line-height:1.8em;
  vertical-align:middle;
  padding:5px;
  border-right:1px solid #798d8f;
  background-color:white;
  color:black;
}

li.channel:hover
{
  text-decoration:underline;
  cursor:pointer;
}

li.channel.selected
{
  background-color:#149a80;
  color:white;
}

li.channel.highlighted
{
  color:#e12e1c;
  font-style:italic;
  font-weight:normal;
}

i.channel.close
{
  margin-left:5px;
  color:#e12e1c;
}
</style>
