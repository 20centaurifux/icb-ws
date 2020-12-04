import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export const Store = new Vuex.Store({
  state: {
    windowState: 'visible'
  },
  mutations: {
    visible (state) {
      state.windowState = 'visible'
    },
    hidden (state) {
      state.windowState = 'hidden'
    }
  },
  getters: {
    windowState: state => state.windowState
  }
})
