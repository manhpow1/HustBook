import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/index.css'
import { useUserState } from './store/user-state'

const { checkAuth } = useUserState()

async function initApp() {
    await checkAuth()
    const app = createApp(App)
    app.use(router)
    app.mount('#app')
}

initApp()