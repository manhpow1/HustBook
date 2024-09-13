import { ref, computed } from 'vue'

const token = ref(localStorage.getItem('token'))

export const useUserState = () => {
    const isLoggedIn = computed(() => !!token.value)

    const login = (newToken) => {
        token.value = newToken
        localStorage.setItem('token', newToken)
    }

    const logout = () => {
        token.value = null
        localStorage.removeItem('token')
    }

    return {
        isLoggedIn,
        login,
        logout
    }
}