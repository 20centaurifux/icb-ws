<template>
  <div class="users">
    <div v-for="(user, i) in sortedUsers" :key="i" class="user">
      <div style="padding: 5px">
        <font-awesome-icon :icon="userIcon(user)" />
      </div>
      <div>
        {{ user }}
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  props: ['users', 'moderator'],

  computed: {
    sortedUsers: function () {
      const sortedList = [...this.users];

      return sortedList.sort((a, b) => a.toLowerCase() > b.toLowerCase());
    },
  },

  methods: {
    userIcon: function (username) {
      return username.toLowerCase() === (this.moderator || '').toLowerCase() ? 'eye' : 'user';
    },
  },
});
</script>

<style scoped>
div.users {
  display: flex;
  flex-direction: column;
  overflow: auto;
}

div.user {
  display: flex;
  align-items: center;
}
</style>
