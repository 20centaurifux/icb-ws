<template>
  <div class="container" v-show="visible">
    <div class="nick">
      <font-awesome-icon icon="user" class="child" />

      <div class="child">
        {{ nickname }}
      </div>
    </div>

    <input ref="textInput"
           class="textbox"
           maxlength="200"
           :value="value"
           @input="handleInput"
           @keyup="handleKeyup" />
  </div>
</template>

<script>
import Vue from 'vue'

export default {
  props: ['nickname', 'value', 'visible'],
  methods: {
    handleInput: function (e) {
      this.$emit('input', e.target.value)
    },
    handleKeyup: function (e) {
      if (event.key === 'Enter') {
        this.$emit('send', e.target.value)
      }
    }
  },
  mounted: function () {
    if (this.visible) {
      Vue.nextTick(() => this.$refs.textInput.focus())
    }
  },
  watch: {
    visible: function (v) {
      if (v) {
        Vue.nextTick(() => this.$refs.textInput.focus())
      }
    },
    '$store.state.windowState': function (value) {
      if (value === 'visible' && this.visible) {
        Vue.nextTick(() => this.$refs.textInput.focus())
      }
    }
  }
}
</script>

<style scoped>
  .container
  {
    display:flex;
    justify-content:center;
    align-items:center;
    background-color:#102027;
    max-height:40px;
    min-height:40px;
  }

  .nick
  {
    display:flex;
    justify-content:center;
    align-items:center;
    color:white;
    padding:5px;
  }

  .child
  {
    font-family:'Roboto', sans-serif;
    font-size:16px;
    height:20px;
    line-height:20px;
    padding-right:3px;
  }

  .textbox
  {
    flex-grow:1;
    overflow:auto;
    border:1px solid #3498DB;
    height:20px;
    vertical-align:center;
  }

  .textbox:focus
  {
    outline:none;
  }
</style>
