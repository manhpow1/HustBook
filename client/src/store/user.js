import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useUserStore = defineStore('user', () => {
    const user = ref(null)
    const token = ref(localStorage.getItem('token'))

    const isLoggedIn = computed(() => !!user.value)
    const userId = computed(() => user.value?.id)

    async function fetchUser() {
        if (token.value) {
            try {
                const response = await api.get('/user/profile')
                user.value = response.data
            } catch (error) {
                console.error('Failed to fetch user:', error)
                logout()
            }
        }
    }

    function setUser(userData) {
        user.value = userData
    }

    function setToken(newToken) {
        token.value = newToken
        localStorage.setItem('token', newToken)
    }

    function logout() {
        user.value = null
        token.value = null
        localStorage.removeItem('token')
    }

    return {
        user,
        token,
        isLoggedIn,
        userId,
        fetchUser,
        setUser,
        setToken,
        logout
    }
})