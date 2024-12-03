import { createApp } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import App from './Views/App.vue';
import Login from './Views/Login.vue';
import Chat from './Views/Chat.vue';
import { Store } from './store.mjs';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye, faSpinner, faUnlink, faUser, faWindowClose } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

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
];

const router = createRouter({
  history: createMemoryHistory(),
  routes: routes
});

library.add(faSpinner);
library.add(faUnlink);
library.add(faWindowClose);
library.add(faUser);
library.add(faEye);

const app = createApp(App);

app.use(Store);
app.use(router)
  .component('font-awesome-icon', FontAwesomeIcon)
  .mount('#app');

if (Notification.permission !== 'granted') {
  Notification.requestPermission();
}