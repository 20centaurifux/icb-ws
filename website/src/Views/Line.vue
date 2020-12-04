<template>
  <span ref="line">{{ text }}</span>
</template>

<script>
const Emojify = require('emojify.js')

export default {
  props: ['text', 'linkify', 'emojify'],
  mounted: function () {
    if (this.linkify) {
      this.$refs.line.innerHTML = this.linkifyText(this.$refs.line.innerHTML)
    }

    if (this.emojify) {
      this.$refs.line.innerHTML = Emojify.replace(this.$refs.line.innerHTML)
    }
  },
  methods: {
    linkifyText: function (text) {
      const urlRegex = /(\b((https?|ftps?|scp|gopher):\/\/|www\.)[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig

      return text.replace(urlRegex, url => {
        if (url.startsWith('www.')) {
          url = 'http://' + url
        }

        return '<a target="_blank" href="' + url + '">' + url + '</a>'
      })
    }
  }
}
</script>

<style>
  img.emoji
  {
    width:14px;
    padding:0;
    margin:0;
  }
</style>
