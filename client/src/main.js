import { createApp } from 'vue';
import { createHead } from '@unhead/vue';
import App from './App.vue';
import router from './router';
import pinia from './pinia';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import './styles/index.css';

// Initialize Vue application
const app = createApp(App);

// Create Head instance for managing document head
const head = createHead();

// Use plugins in the correct order
app.use(pinia); // Initialize Pinia before using stores
app.use(router);
app.use(head);

// Optional: Initialize user store and fetch user data if token exists
const userStore = pinia.state.value.userStore
  ? pinia.state.value.userStore
  : null;

// If you have a token stored (e.g., in cookies or localStorage), fetch user data
if (userStore && userStore.accessToken) {
  userStore.fetchUser().catch((error) => {
    console.error('Error fetching user on app initialization:', error);
    // Optionally handle the error, e.g., logout user
    userStore.logout();
  });
}

// Mount the app with error handling
app.mount('#app');