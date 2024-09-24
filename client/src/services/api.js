import axios from 'axios'
import { useUserState } from '../store/user-state'

const api = axios.create({
    baseURL: import.meta.env.VUE_APP_API_BASE_URL || 'http://localhost:3000/api'
})

api.interceptors.request.use(config => {
    const { token, deviceToken } = useUserState()

    if (token.value) {
        config.headers['Authorization'] = `Bearer ${token.value}`
    }

    if (deviceToken.value) {
        config.headers['X-Device-Token'] = deviceToken.value
    }

    return config
})

export default api