
import { createApp } from 'vue';
import { createHead } from '@unhead/vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import './styles/index.css';
import logger from './services/logging'; // Ensure logger is properly set up
import { useUserStore } from './stores/userStore';

async function initApp() {
  try {
    const pinia = createPinia();
    const app = createApp(App);
    const head = createHead();

    // Use plugins in the correct order
    app.use(pinia); // Initialize Pinia before using stores
    app.use(router);
    app.use(head);

    // Initialize user store and fetch user data if token exists
    const userStore = useUserStore();

    if (userStore.accessToken) { // accessToken is a ref in the store
      await userStore.fetchUserProfile().catch((error) => {
        logger.error('Error fetching user on app initialization:', error);
        userStore.logout();
      });
    }

    // Mount the app with error handling
    app.mount('#app');
  } catch (error) {
    logger.error('Error during app initialization:', error);
  }
}

initApp();