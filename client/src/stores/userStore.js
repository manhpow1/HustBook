import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiService from '../services/api' // Import as default

export const useUserStore = defineStore('user', () => {
    const user = ref(null)
    const token = ref(localStorage.getItem('token'))
    const deviceToken = ref(localStorage.getItem('deviceToken'))
    const loading = ref(false)
    const error = ref(null)

    const isLoggedIn = computed(() => !!user.value)
    const userId = computed(() => user.value?.id)

    async function login(phonenumber, password) {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.login({ phonenumber, password })
            if (response.data.code === '1000') {
                setUser(response.data.data)
                setTokens(response.data.data.token, response.data.data.deviceToken)
                return true
            }
            return false
        } catch (err) {
            console.error('Login error:', err)
            error.value = 'Failed to login'
            return false
        } finally {
            loading.value = false
        }
    }

    async function logout() {
        loading.value = true
        error.value = null
        try {
            await apiService.logout()
            user.value = null
            setTokens(null, null)
        } catch (err) {
            console.error('Logout error:', err)
            error.value = 'Failed to logout'
        } finally {
            loading.value = false
        }
    }

    function setUser(userData) {
        user.value = userData
    }

    function setTokens(newToken, newDeviceToken) {
        token.value = newToken
        deviceToken.value = newDeviceToken
        if (newToken && newDeviceToken) {
            localStorage.setItem('token', newToken)
            localStorage.setItem('deviceToken', newDeviceToken)
            apiService.setAuthHeaders(newToken, newDeviceToken) // Set headers in apiService
        } else {
            localStorage.removeItem('token')
            localStorage.removeItem('deviceToken')
            apiService.setAuthHeaders(null, null) // Clear headers in apiService
        }
    }

    async function fetchUser() {
        if (token.value) {
            loading.value = true
            error.value = null
            try {
                const response = await apiService.getUserProfile()
                setUser(response.data.data)
            } catch (err) {
                console.error('Failed to fetch user:', err)
                error.value = 'Failed to fetch user profile'
                logout()
            } finally {
                loading.value = false
            }
        }
    }

    async function updateProfile(username, avatar) {
        loading.value = true
        error.value = null
        try {
            const formData = new FormData()
            formData.append('username', username)
            if (avatar) {
                formData.append('avatar', avatar)
            }
            const response = await apiService.updateUserProfile(formData)
            if (response.data.code === '1000') {
                setUser(response.data.data)
                return true
            }
            return false
        } catch (err) {
            console.error('Update profile error:', err)
            error.value = 'Failed to update profile'
            return false
        } finally {
            loading.value = false
        }
    }

    return {
        user,
        token,
        deviceToken,
        isLoggedIn,
        userId,
        loading,
        error,
        login,
        logout,
        setUser,
        setTokens,
        fetchUser,
        updateProfile,
    }
})