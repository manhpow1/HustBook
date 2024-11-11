<template>
  <div id="app" class="font-sans min-h-screen flex flex-col">
    <keep-alive>
      <ErrorBoundary component-name="App">
        <Suspense>
          <template #default>
            <Layout>
              <NewItemsNotification />
              <router-view v-slot="{ Component }">
                <keep-alive>
                  <component :is="Component" />
                </keep-alive>
              </router-view>
            </Layout>
          </template>
          <template #fallback>
            <div class="loading flex items-center justify-center h-screen">
              <LoaderIcon class="animate-spin h-10 w-10 text-indigo-600" />
              <p class="ml-2 text-lg font-medium text-gray-700">Loading...</p>
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
import { useRouter } from 'vue-router'
import { useUserStore } from './stores/userStore'
import { useHead } from '@unhead/vue'
import NewItemsNotification from './components/notification/NewItemsNotification.vue'

const router = useRouter()
const userStore = useUserStore()

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    {
      'http-equiv': 'Content-Security-Policy',
      content: "default-src 'self'; connect-src 'self' http://localhost:3000; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com"
    },
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
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  @apply bg-gray-100;
}

.loading {
  @apply flex flex-col items-center justify-center min-h-screen;
}
</style>