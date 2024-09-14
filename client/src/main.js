import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './index.css'
import { useUserState } from './userState'

const { checkAuth } = useUserState()

async function initApp() {
    await checkAuth()
    createApp(App).use(router).mount('#app')
}

initApp()