<template>
  <ErrorBoundary component="App">
    <Layout>
      <router-view></router-view>
    </Layout>
  </ErrorBoundary>
</template>

<script setup>
import Layout from './components/layout/Layout.vue'
import ErrorBoundary from './components/shared/ErrorBoundary.vue'
</script>