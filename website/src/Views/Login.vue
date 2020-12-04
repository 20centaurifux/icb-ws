<template>
<div id="screen">
  <div id="dialog">
    <div id="form">
      <form>
        <label for="nickname" class="login">Username</label>
        <input type="text" placeholder="Enter Nickname" name="nickname" maxlength="16" required autofocus class="login" v-model="nickname">

        <hr class="login">

        <label for="password" class="login">Password (optional)</label>
        <input type="password" placeholder="Enter Password" name="password" value="" maxlength="16" class="login" v-model="password">

        <hr class="login">

        <label for="group" class="login">Group</label>
        <input type="text" placeholder="Enter Group" name="group" value="1" maxlength="16" required class="login" v-model="group">

        <hr class="login">

        <button id="login-button" type="button" class="login" :disabled="!loginEnabled" @click="login">Join Internet CB Network</button>
      </form>
    </div>
  </div>
</div>
</template>

<script>
import { Config } from '../config.mjs'

export default {
  data () {
    return {
      nickname: Config.defaultNick,
      password: '',
      group: Config.defaultGroup
    }
  },
  computed: {
    loginEnabled: function () {
      return this.nickname.trim().length > 0 && this.group.trim().length > 0
    }
  },
  methods: {
    login: function () {
      this.$router.push({
        name: 'chat',
        params: {
          credentials: {
            nickname: this.nickname,
            password: this.password,
            group: this.group
          }
        }
      })
    }
  }
}
</script>

<style scoped>
#screen {
  position:fixed;
  width:100%;
  height:100%;
  background-size:cover;
  background-position:50% 50%;
  background-image:url('../assets/bg-login.jpg');
  background-repeat:repeat;
}

#dialog
{
  display:flex;
  align-items:center;
  justify-content:center;
  position:fixed;
  width:100%;
  height:100%;
}

#form
{
  background-color:white;
  padding:20px;
  border-radius:5px;
  width:400px;
}

label
{
  line-height:2em;
  font-size:13px;
  font-weight:normal;
}

input
{
  border:0;
  border-bottom:0;
  outline:0;
  font-size:18px;
  line-height:2em;
  display:block;
  width:100%;
}

hr
{
  border:0;
  height:1px;
  background:#616161;
  background-image:linear-gradient(to right, #616161, #717171, #616161);
}

button
{
  background-color:#393939;
  border:0;
  border-radius:5px;
  color:white;
  padding:20px;
  text-align:center;
  text-decoration:none;
  display:inline-block;
  font-size:16px;
  width:100%;
  margin-top:20px;
}

button[disabled]
{
  opacity:0.3;
}
</style>
