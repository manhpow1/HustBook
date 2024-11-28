import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '../services/api';
import VueCookies from 'vue-cookies';
import router from '../router'; // Ensure you have access to the router

export const useUserStore = defineStore('user', () => {
    // State
    const user = ref(null);
    const isLoading = ref(false);
    const error = ref(null);
    const successMessage = ref('');

    // Getters
    const isLoggedIn = computed(() => !!user.value);

    // Initialize tokens from cookies
    const accessToken = ref(VueCookies.get('accessToken') || null);
    const refreshToken = ref(VueCookies.get('refreshToken') || null);
    const deviceToken = ref(VueCookies.get('deviceToken') || null);

    // Set default axios headers
    if (accessToken.value && deviceToken.value) {
        apiService.setAuthHeaders(accessToken.value, deviceToken.value);
    }

    // Actions

    // Set tokens in cookies and axios headers
    function setTokens(newAccessToken, newRefreshToken, newDeviceToken) {
        accessToken.value = newAccessToken;
        refreshToken.value = newRefreshToken;
        deviceToken.value = newDeviceToken;

        VueCookies.set('accessToken', newAccessToken);
        VueCookies.set('refreshToken', newRefreshToken);
        VueCookies.set('deviceToken', newDeviceToken);

        apiService.setAuthHeaders(newAccessToken, newDeviceToken);
    }

    // Clear tokens from cookies and axios headers
    function clearTokens() {
        accessToken.value = null;
        refreshToken.value = null;
        deviceToken.value = null;

        VueCookies.remove('accessToken');
        VueCookies.remove('refreshToken');
        VueCookies.remove('deviceToken');

        apiService.setAuthHeaders(null, null);
    }

    // Set user data
    function setUserData(userData) {
        user.value = userData;
    }

    // Clear user data
    function clearUserData() {
        user.value = null;
    }

    // Login
    async function login(phonenumber, password) {
        isLoading.value = true;
        error.value = null;
        successMessage.value = '';

        try {
            const response = await apiService.login({ phonenumber, password });
            if (response.data.code === '1000') {
                const { token, refreshToken: newRefreshToken, deviceToken: newDeviceToken } = response.data.data;
                setTokens(token, newRefreshToken, newDeviceToken);
                await fetchUserProfile();
                return true;
            } else {
                error.value = response.data.message || 'Login failed';
                return false;
            }
        } catch (err) {
            console.error('Login error:', err);
            error.value = err.response?.data?.message || 'An error occurred during login';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    // Register
    async function register(phonenumber, password) {
        isLoading.value = true;
        error.value = null;
        successMessage.value = '';

        try {
            const response = await apiService.register({ phonenumber, password });
            if (response.data.code === '1000') {
                successMessage.value = 'Registration successful. Please verify your account.';
                return true;
            } else {
                error.value = response.data.message || 'Registration failed';
                return false;
            }
        } catch (err) {
            console.error('Registration error:', err);
            error.value = err.response?.data?.message || 'An error occurred during registration';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    // Logout
    async function logout() {
        isLoading.value = true;
        error.value = null;
        successMessage.value = '';

        try {
            await apiService.logout();
            clearTokens();
            clearUserData();
            successMessage.value = 'Logout successful';
            router.push('/login');
        } catch (err) {
            console.error('Logout error:', err);
            error.value = 'An error occurred during logout';
        } finally {
            isLoading.value = false;
        }
    }

    // Get Verification Code
    async function getVerifyCode(phonenumber) {
        isLoading.value = true;
        error.value = null;
        successMessage.value = '';

        try {
            const response = await apiService.getVerifyCode({ phonenumber });
            if (response.data.code === '1000') {
                successMessage.value = 'Verification code sent successfully';
                // Start cooldown if necessary
                return true;
            } else {
                error.value = response.data.message || 'Failed to send verification code';
                return false;
            }
        } catch (err) {
            console.error('Get verify code error:', err);
            error.value = err.response?.data?.message || 'An error occurred while sending verification code';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    // Verify Code
    async function verifyCode(phonenumber, code) {
        isLoading.value = true;
        error.value = null;
        successMessage.value = '';

        try {
            const response = await apiService.verifyCode({ phonenumber, code_verify: code });
            if (response.data.code === '1000') {
                const { token, refreshToken: newRefreshToken, deviceToken: newDeviceToken } = response.data.data;
                setTokens(token, newRefreshToken, newDeviceToken);
                await fetchUserProfile();
                successMessage.value = 'Verification successful';
                return true;
            } else {
                error.value = response.data.message || 'Verification failed';
                return false;
            }
        } catch (err) {
            console.error('Verify code error:', err);
            error.value = err.response?.data?.message || 'An error occurred during verification';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    // Fetch User Profile
    async function fetchUserProfile() {
        if (!accessToken.value || !deviceToken.value) {
            clearUserData();
            return;
        }

        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiService.getUserProfile();
            if (response.data.code === '1000') {
                setUserData(response.data.data);
            } else {
                error.value = response.data.message || 'Failed to fetch user profile';
                clearTokens();
                clearUserData();
            }
        } catch (err) {
            console.error('Fetch user profile error:', err);
            error.value = err.response?.data?.message || 'An error occurred while fetching user profile';
            clearTokens();
            clearUserData();
        } finally {
            isLoading.value = false;
        }
    }

    // Refresh Access Token
    async function refreshAccessToken() {
        const currentRefreshToken = VueCookies.get('refreshToken');
        if (!currentRefreshToken) {
            await logout();
            return null;
        }

        try {
            const response = await apiService.refreshToken(currentRefreshToken);
            if (response.data.code === '1000') {
                const { token: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
                setTokens(newAccessToken, newRefreshToken, deviceToken.value);
                return newAccessToken;
            } else {
                await logout();
                return null;
            }
        } catch (error) {
            console.error('Failed to refresh access token:', error);
            await logout();
            return null;
        }
    }

    // Clear Messages
    function clearMessages() {
        error.value = null;
        successMessage.value = '';
    }

    return {
        // State
        user,
        isLoading,
        error,
        successMessage,
        isLoggedIn,
        // Actions
        login,
        register,
        logout,
        getVerifyCode,
        verifyCode,
        fetchUserProfile,
        refreshAccessToken,
        clearMessages,
    };
});
