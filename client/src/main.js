
import { createApp } from 'vue';
import { createHead } from '@unhead/vue';
import App from './App.vue';
import router from './router';
import pinia from './pinia';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import './styles/index.css';
import logger from './services/logging'; // Ensure logger is properly set up

async function initApp() {
  try {
    const app = createApp(App);
    const head = createHead();

    // Use plugins in the correct order
    app.use(pinia); // Initialize Pinia before using stores
    app.use(router);
    app.use(head);

    // Initialize user store and fetch user data if token exists
    const userStore = pinia.state.value.userStore
      ? pinia.state.value.userStore
      : null;

    if (userStore && userStore.token) {
      await userStore.fetchUser().catch((error) => {
        logger.error('Error fetching user on app initialization:', error);
        // Optionally handle the error, e.g., logout user
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