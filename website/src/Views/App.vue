<template>
<div id="app">
  <router-view></router-view>
</div>
</template>

<script>
export default
{
  created: function () {
    const store = this.$store

    window.addEventListener('focus', function () {
      store.commit('visible')
    })

    window.addEventListener('blur', function () {
      store.commit('hidden')
    })
  }
}
</script>

<style>
body {
  font-family:'Roboto', sans-serif;
  font-size:16px;
  background-color:white;
  padding:0;
  margin:0;
  height:100%;
}

#app {
  position:absolute;
  padding:0;
  margin:0;
  height:100%;
  width:100%;
  overflow:hidden;
}
</style>
