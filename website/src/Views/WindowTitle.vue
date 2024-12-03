<script>
import { defineComponent, nextTick } from 'vue';

export default defineComponent({
  props: ['title', 'unread'],
  render: () => '',

  methods: {
    updateTitle: function () {
      let displayTitle = this.title;

      if (this.$store.state.windowState === 'hidden' && this.unread > 0) {
        displayTitle += ' (' + this.unread + ')';
      }

      nextTick(() => (document.title = displayTitle));
    },
  },

  mounted: function () {
    this.updateTitle();
  },

  watch: {
    title: function () {
      this.updateTitle();
    },
    unread: function () {
      this.updateTitle();
    },
    '$store.state.windowState': function (value) {
      this.updateTitle();
    },
  },
});
</script>
