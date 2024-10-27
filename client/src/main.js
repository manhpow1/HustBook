import { createApp } from 'vue'
import { createHead } from '@vueuse/head'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import './styles/index.css'
import { useUserState } from './stores/userState'
import { useUserStore } from './stores/userStore'
import en from './i18n/en'

const userStore = useUserStore()
const { checkAuth } = useUserState()
const messages = { en };
const pinia = createPinia()

if (userStore.token) {
    userStore.fetchUser()
}

const i18n = createI18n({
    locale: 'en',
    messages,
});

async function initApp() {
    try {
        await checkAuth();
        const app = createApp(App);
        const head = createHead();
        app.use(router);
        app.use(head);
        app.use(i18n);
        console.log('Loaded i18n messages:', messages.en);
        app.use(pinia);
        app.mount('#app');
    } catch (error) {
        console.error('Error during app initialization:', error);
    }
}

initApp()