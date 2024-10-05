import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import { useUserStore } from './userStore'

export const useAuthStore = defineStore('auth', () => {
    const userStore = useUserStore()

    const isLoading = ref(false)
    const error = ref(null)
    const successMessage = ref('')
    const cooldownTime = ref(0)

    async function login(phonenumber, password) {
        isLoading.value = true
        error.value = null
        try {
            const response = await api.post('/auth/login', { phonenumber, password })
            if (response.data.code === '1000') {
                userStore.setUser(response.data.data)
                userStore.setTokens(response.data.data.token, response.data.data.deviceToken)
                return true
            } else {
                error.value = response.data.message || 'Login failed'
                return false
            }
        } catch (err) {
            console.error('Login error:', err)
            error.value = err.response?.data?.message || 'An error occurred during login'
            return false
        } finally {
            isLoading.value = false
        }
    }

    async function register(phonenumber, password) {
        isLoading.value = true
        error.value = null
        try {
            const response = await api.post('/auth/signup', { phonenumber, password })
            if (response.data.code === '1000') {
                successMessage.value = 'Registration successful. Please verify your account.'
                return true
            } else {
                error.value = response.data.message || 'Registration failed'
                return false
            }
        } catch (err) {
            console.error('Registration error:', err)
            error.value = err.response?.data?.message || 'An error occurred during registration'
            return false
        } finally {
            isLoading.value = false
        }
    }

    async function logout() {
        isLoading.value = true
        error.value = null
        try {
            await api.post('/auth/logout')
            userStore.clearUser()
            successMessage.value = 'Logout successful'
        } catch (err) {
            console.error('Logout error:', err)
            error.value = 'An error occurred during logout'
        } finally {
            isLoading.value = false
        }
    }

    async function getVerifyCode(phonenumber) {
        isLoading.value = true
        error.value = null
        try {
            const response = await api.post('/auth/get-verify-code', { phonenumber })
            if (response.data.code === '1000') {
                successMessage.value = 'Verification code sent successfully'
                startCooldown()
                return true
            } else {
                error.value = response.data.message || 'Failed to send verification code'
                return false
            }
        } catch (err) {
            console.error('Get verify code error:', err)
            error.value = err.response?.data?.message || 'An error occurred while sending verification code'
            return false
        } finally {
            isLoading.value = false
        }
    }

    async function verifyCode(phonenumber, code) {
        isLoading.value = true
        error.value = null
        try {
            const response = await api.post('/auth/check-verify-code', { phonenumber, code_verify: code })
            if (response.data.code === '1000') {
                userStore.setTokens(response.data.data.token, response.data.data.deviceToken)
                successMessage.value = 'Verification successful'
                return true
            } else {
                error.value = response.data.message || 'Verification failed'
                return false
            }
        } catch (err) {
            console.error('Verify code error:', err)
            error.value = err.response?.data?.message || 'An error occurred during verification'
            return false
        } finally {
            isLoading.value = false
        }
    }

    function startCooldown() {
        cooldownTime.value = 120
        const timer = setInterval(() => {
            cooldownTime.value--
            if (cooldownTime.value <= 0) {
                clearInterval(timer)
            }
        }, 1000)
    }

    function clearMessages() {
        error.value = null
        successMessage.value = ''
    }

    return {
        isLoading,
        error,
        successMessage,
        cooldownTime,
        login,
        register,
        logout,
        getVerifyCode,
        verifyCode,
        clearMessages
    }
})