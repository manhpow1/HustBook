<template>
  <div id="app" class="font-sans min-h-screen flex flex-col">
    <!-- Global Error Boundary -->
    <ErrorBoundary component-name="App">
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
          <Loader class="animate-spin h-10 w-10 text-indigo-600" aria-hidden="true" />
          <p class="ml-2 text-lg font-medium text-gray-700">Loading...</p>
        </div>
      </template>
    </ErrorBoundary>
    <!-- Global Toast Notifications -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Layout from './components/layout/Layout.vue';
import ErrorBoundary from './components/shared/ErrorBoundary.vue';
import logger from './services/logging';
import { Loader } from 'lucide-vue-next';
import { useUserStore } from './stores/userStore';
import { useHead } from '@unhead/vue';
import NewItemsNotification from './components/notification/NewItemsNotification.vue';
import { useGlobalErrorHandler } from './composables/useGlobalErrorHandler';
import Toast from './components/ui/Toast.vue';

// Initialize Global Error Handling
logger.debug('Initializing global error handling...');
useGlobalErrorHandler();

// Define components to cache with KeepAlive
const cachedComponents = ref(['Home', 'Profile', 'Settings']);

// Set up Head for SEO and Security
logger.debug('Setting up meta tags...');
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    {
      'http-equiv': 'Content-Security-Policy',
      content: [
        "default-src * 'unsafe-inline' 'unsafe-eval'",
        "connect-src * 'unsafe-inline'",
        "script-src * 'unsafe-inline' 'unsafe-eval'",
        "style-src * 'unsafe-inline'",
        "img-src * data: blob:",
        "media-src * data: blob:"
      ].join('; ')
    }
  ],
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    },
  ],
});

const userStore = useUserStore();

// Initialize auth state
onMounted(async () => {
  logger.debug('App mounted. Initializing user state...');
  try {
    if (userStore.isLoggedIn) {
      logger.debug('Fetching user profile...');
      await userStore.fetchUserProfile().catch((error) => {
        logger.error('Error fetching user profile:', error);
        userStore.clearAuthState();
      });
    } else {
      logger.debug('User not logged in.');
    }
  } catch (error) {
    logger.error('Error during app initialization:', error);
  }
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
