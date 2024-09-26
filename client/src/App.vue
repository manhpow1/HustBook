<template>
  <ErrorBoundary component="App">
    <Layout>
      <router-view></router-view>
    </Layout>
  </ErrorBoundary>
</template>

<script setup>
import Layout from './components/Layout.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
</script>