<template>
  <Layout>
    <router-view></router-view>
  </Layout>
</template>

<script>
import Layout from './components/Layout.vue'

export default {
  name: 'App',
  components: {
    Layout
  }
}
</script>