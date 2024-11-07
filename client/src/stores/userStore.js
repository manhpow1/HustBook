import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import apiService from '../services/api'

export const useUserStore = defineStore('user', () => {
    const user = ref(null)
    const token = ref(localStorage.getItem('token'))
    const deviceToken = ref(localStorage.getItem('deviceToken'))
    const loading = ref(false)
    const error = ref(null)

    const isLoggedIn = computed(() => !!user.value)
    const userId = computed(() => user.value?.id)

    apiService.setAuthHeaders(token.value, deviceToken.value)

    async function checkAuth() {
        console.log("Checking authentication");
        if (token.value && deviceToken.value) {
            try {
                const response = await apiService.authCheck();
                console.log("Auth check response:", response.data);
                if (response.data.isAuthenticated) {
                    await fetchUser();
                    console.log("User authenticated, user data:", user.value);
                } else {
                    console.log("User not authenticated. Logging out.");
                    logout();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                logout();
            }
        } else {
            console.log("No token or device token found. Setting user to null.");
            user.value = null;
        }
        console.log("Final authentication state:", isLoggedIn.value); // Log `isLoggedIn` at end of check
    }

    async function login(phonenumber, password) {
        console.log("Logging in with phone number:", phonenumber)
        loading.value = true
        error.value = null
        try {
            const response = await apiService.login({ phonenumber, password })
            if (response.data.code === '1000') {
                setTokens(response.data.data.token, response.data.data.deviceToken)
                setUser(response.data.data)
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
        console.log("Logging out")
        loading.value = true
        error.value = null
        try {
            await apiService.logout()
        } catch (err) {
            console.error('Logout error:', err)
            error.value = 'Failed to logout'
        } finally {
            setTokens(null, null)
            user.value = null
            loading.value = false
            console.log("Logout complete")
        }
    }

    function setUser(newUser) {
        user.value = newUser;
    }

    function setTokens(newToken, newDeviceToken) {
        console.log("Setting tokens:", newToken, newDeviceToken)
        token.value = newToken
        deviceToken.value = newDeviceToken
        if (newToken && newDeviceToken) {
            localStorage.setItem('token', newToken)
            localStorage.setItem('deviceToken', newDeviceToken)
            apiService.setAuthHeaders(newToken, newDeviceToken)
        } else {
            localStorage.removeItem('token')
            localStorage.removeItem('deviceToken')
            apiService.setAuthHeaders(null, null)
        }
    }

    async function fetchUser() {
        if (token.value && deviceToken.value) {
            loading.value = true
            error.value = null
            try {
                const response = await apiService.getUserProfile()
                setUser(response.data.data)
                console.log("Fetched user profile:", response.data.data)
            } catch (err) {
                console.error('Failed to fetch user:', err)
                error.value = 'Failed to fetch user profile'
                logout()
            } finally {
                loading.value = false
            }
        } else {
            console.log("No token or device token found")
            user.value = null
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

    watch(isLoggedIn, (newVal, oldVal) => {
        console.debug(`isLoggedIn changed from ${oldVal} to ${newVal}`);
    });

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
        checkAuth,
        fetchUser,
        updateProfile,
        setUser,
    }
})