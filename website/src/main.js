import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './Views/App.vue'
import Login from './Views/Login.vue'
import Chat from './Views/Chat.vue'
import { Store } from './store.mjs'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faEye, faSpinner, faUnlink, faUser, faWindowClose } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

Vue.use(VueRouter)

library.add(faSpinner)
library.add(faUnlink)
library.add(faWindowClose)
library.add(faUser)
library.add(faEye)

Vue.component('font-awesome-icon', FontAwesomeIcon)

const routes = [
  {
    name: 'root',
    path: '/',
    component: Login
  },
  {
    name: 'chat',
    path: '/icb',
    component: Chat
  }
]

const router = new VueRouter({
  routes: routes
})

new Vue({
  el: '#app',
  router: router,
  store: Store,
  render: h => h(App)
});