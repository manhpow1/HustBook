import { createApp } from 'vue'
import { createHead } from '@unhead/vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import router from './router'
import pinia from './pinia'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import './styles/index.css'
import { useUserStore } from './stores/userStore'
import en from './i18n/en'

const messages = { en };

const i18n = createI18n({
    locale: 'en',
    messages,
});

async function initApp() {
    try {
        const app = createApp(App);
        const head = createHead();

        app.use(pinia);  // Initialize Pinia before using stores
        app.use(router);
        app.use(head);
        app.use(i18n);
        const userStore = useUserStore();
        console.log('Loaded i18n messages:', messages.en);
        if (userStore.token) {
            await userStore.fetchUser();
        }
        await userStore.checkAuth();
        app.mount('#app');
    } catch (error) {
        console.error('Error during app initialization:', error);
    }
}
initApp();