import { createStore } from 'vuex';

export const Store = createStore({
  state: {
    windowState: 'visible'
  },
  mutations: {
    visible(state) {
      state.windowState = 'visible';
    },
    hidden(state) {
      state.windowState = 'hidden';
    }
  },
  getters: {
    windowState: state => state.windowState
  }
});