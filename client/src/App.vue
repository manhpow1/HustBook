<template>
  <div id="app" class="font-sans">
    <ErrorBoundary component="App">
      <Suspense>
        <template #default>
          <Layout>
            <router-view></router-view>
          </Layout>
        </template>
        <template #fallback>
          <div class="loading">
            <LoaderIcon class="animate-spin h-10 w-10 text-indigo-600" />
            <p>Loading...</p>
          </div>
        </template>
      </Suspense>
    </ErrorBoundary>
  </div>
</template>

<script setup>
import { Suspense, onMounted } from 'vue'
import Layout from './components/layout/Layout.vue'
import ErrorBoundary from './components/shared/ErrorBoundary.vue'
import { LoaderIcon } from 'lucide-vue-next'
import { useHead } from '@vueuse/head'

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  ],
})

onMounted(() => {
  document.body.classList.add('bg-gray-100')
})
</script>

<style scoped>
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
</style>