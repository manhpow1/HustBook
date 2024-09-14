import { ref, computed } from 'vue'
import axios from 'axios'

const token = ref(localStorage.getItem('token'))
const isAuthenticated = ref(false)

export const useUserState = () => {
    const isLoggedIn = computed(() => isAuthenticated.value)

    const checkAuth = async () => {
        if (token.value) {
            try {
                const response = await axios.get('http://localhost:3000/api/auth/check', {
                    headers: { Authorization: `Bearer ${token.value}` }
                })
                isAuthenticated.value = response.data.isAuthenticated
            } catch (error) {
                console.error('Auth check failed:', error)
                isAuthenticated.value = false
                token.value = null
                localStorage.removeItem('token')
            }
        } else {
            isAuthenticated.value = false
        }
    }

    const login = (newToken) => {
        token.value = newToken
        localStorage.setItem('token', newToken)
        isAuthenticated.value = true
    }

    const logout = () => {
        token.value = null
        localStorage.removeItem('token')
        isAuthenticated.value = false
    }

    return {
        isLoggedIn,
        login,
        logout,
        checkAuth
    }
}