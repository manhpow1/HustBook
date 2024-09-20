import { ref, computed } from 'vue'
import axios from 'axios'

const token = ref(localStorage.getItem('token'))
const deviceToken = ref(localStorage.getItem('deviceToken'))
const isAuthenticated = ref(false)

export function useUserState() {
    const isLoggedIn = computed(() => isAuthenticated.value)

    const checkAuth = async () => {
        if (token.value && deviceToken.value) {
            try {
                const response = await axios.get('http://localhost:3000/api/auth/check', {
                    headers: {
                        Authorization: `Bearer ${token.value}`,
                        'X-Device-Token': deviceToken.value
                    }
                })
                isAuthenticated.value = response.data.isAuthenticated
            } catch (error) {
                console.error('Auth check failed:', error)
                isAuthenticated.value = false
                token.value = null
                deviceToken.value = null
                localStorage.removeItem('token')
                localStorage.removeItem('deviceToken')
            }
        } else {
            isAuthenticated.value = false
        }
    }

    const login = (newToken, newDeviceToken) => {
        token.value = newToken
        deviceToken.value = newDeviceToken
        localStorage.setItem('token', newToken)
        localStorage.setItem('deviceToken', newDeviceToken)
        isAuthenticated.value = true
    }

    const logout = () => {
        token.value = null
        deviceToken.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('deviceToken')
        isAuthenticated.value = false
    }

    return {
        token,
        deviceToken,
        isLoggedIn,
        login,
        logout,
        checkAuth
    }
}