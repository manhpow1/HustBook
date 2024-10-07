<template>
  <div id="app" class="font-sans">
    <keep-alive>
      <ErrorBoundary component-name="App">
        <Suspense>
          <template #default>
            <Layout>
              <router-view v-slot="{ Component }">
                <keep-alive>
                  <component :is="Component" />
                </keep-alive>
              </router-view>
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
    </keep-alive>

  </div>
</template>

<script setup>
import { Suspense, onMounted } from 'vue'
import Layout from './components/layout/Layout.vue'
import ErrorBoundary from './components/shared/ErrorBoundary.vue'
import { LoaderIcon } from 'lucide-vue-next'
import { useHead } from '@vueuse/head'
import { useRouter } from 'vue-router'
import { useUserStore } from './stores/userStore'

const router = useRouter()
const userStore = useUserStore()

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { 'http-equiv': 'Content-Security-Policy', content: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com" },
  ],
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  ],
})

onMounted(() => {
  document.body.classList.add('bg-gray-100')

  // Check user authentication status
  userStore.checkAuth()

  // Add a global navigation guard for protected routes
  router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth && !userStore.isAuthenticated) {
      next('/login')
    } else {
      next()
    }
  })
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