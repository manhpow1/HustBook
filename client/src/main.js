
import { createApp } from 'vue';
import { createHead } from '@unhead/vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import './styles/index.css';
import logger from './services/logging';

// Create core app instance and plugins
const pinia = createPinia();
const app = createApp(App);
const head = createHead();

// Use plugins
app.use(pinia);
app.use(router);
app.use(head);

// Mount app immediately to avoid initialization issues
app.mount('#app');

// Log any unhandled errors
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  logger.error('Uncaught error:', event.error);
});
