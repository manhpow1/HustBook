<template>
  <div id="app" class="font-sans min-h-screen flex flex-col">
    <!-- Global Error Boundary -->
    <ErrorBoundary component-name="App">
      <!-- Suspense for Asynchronous Loading -->
      <Suspense>
        <template #default>
          <Layout>
            <NewItemsNotification />
            <!-- Router View with Keep-Alive for Specific Components -->
            <router-view v-slot="{ Component }">
              <KeepAlive :include="cachedComponents">
                <component :is="Component" />
              </KeepAlive>
            </router-view>
          </Layout>
        </template>
        <template #fallback>
          <!-- Fallback Loading Indicator -->
          <div class="loading flex items-center justify-center h-screen" role="status" aria-live="polite">
            <LoaderIcon class="animate-spin h-10 w-10 text-indigo-600" aria-hidden="true" />
            <p class="ml-2 text-lg font-medium text-gray-700">Loading...</p>
          </div>
        </template>
      </Suspense>
    </ErrorBoundary>
    <!-- Global Toast Notifications -->
    <Toast />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Layout from './components/layout/Layout.vue';
import ErrorBoundary from './components/shared/ErrorBoundary.vue';
import { LoaderIcon } from 'lucide-vue-next';
import { useUserStore } from './stores/userStore';
import { useHead } from '@unhead/vue';
import NewItemsNotification from './components/notification/NewItemsNotification.vue';
import { useGlobalErrorHandler } from './composables/useGlobalErrorHandler';
import Toast from './components/ui/Toast.vue';

// Initialize Global Error Handling
useGlobalErrorHandler();

// Define components to cache with KeepAlive
const cachedComponents = ref(['Home', 'Profile', 'Settings']); // Add component names as needed

// Set up Head for SEO and Security
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    {
      'http-equiv': 'Content-Security-Policy',
      content:
        "default-src 'self'; connect-src 'self' https://api.yourdomain.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com",
    },
  ],
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    },
  ],
});

const userStore = useUserStore();

onMounted(() => {
  document.body.classList.add('bg-gray-100');
  // Check user authentication status
  userStore.checkAuth();
});
</script>

<style scoped>
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.loading {
  @apply flex flex-col items-center justify-center min-h-screen;
}
</style>