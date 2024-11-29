import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '../services/api';
import Cookies from 'js-cookie';
import router from '../router';

export const useUserStore = defineStore('user', () => {
    // State
    const user = ref(null);
    const isLoading = ref(false);
    const error = ref(null);
    const successMessage = ref('');

    // Getters
    const isLoggedIn = computed(() => !!user.value);

    // Initialize tokens from cookies
    const accessToken = ref(Cookies.get('accessToken') || null);
    const refreshToken = ref(Cookies.get('refreshToken') || null);

    // Set default axios headers
    if (accessToken.value) {
        apiService.setAuthHeaders(accessToken.value);
    }

    // Actions

    // Set tokens in cookies and axios headers
    function setTokens(newAccessToken, newRefreshToken) {
        accessToken.value = newAccessToken;
        refreshToken.value = newRefreshToken;

        Cookies.set('accessToken', newAccessToken);
        Cookies.set('refreshToken', newRefreshToken);

        apiService.setAuthHeaders(newAccessToken);
    }

    // Clear tokens from cookies and axios headers
    function clearTokens() {
        accessToken.value = null;
        refreshToken.value = null;

        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');

        apiService.setAuthHeaders(null);
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
    async function login(phoneNumber, password, deviceId) {
        isLoading.value = true;
        error.value = null;
        successMessage.value = '';

        try {
            const response = await apiService.login({ phoneNumber, password, deviceId });
            const data = response.data;

            if (data.code === '1000') {
                const { token, refreshToken: newRefreshToken } = data.data;
                setTokens(token, newRefreshToken);
                await fetchUserProfile();
                return true;
            } else {
                error.value = data.message || 'Login failed';
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
    async function register(phoneNumber, password, uuid) {
        isLoading.value = true;
        error.value = null;
        successMessage.value = '';

        try {
            const response = await apiService.register({ phoneNumber, password, uuid });
            const data = response.data;

            if (data.code === '1000') {
                successMessage.value = 'Registration successful. Please verify your account.';
                return true;
            } else {
                error.value = data.message || 'Registration failed';
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
    async function getVerifyCode(phoneNumber) {
        isLoading.value = true;
        error.value = null;
        successMessage.value = '';

        try {
            const response = await apiService.getVerifyCode({ phoneNumber });
            const data = response.data;

            if (data.code === '1000') {
                successMessage.value = 'Verification code sent successfully';
                return true;
            } else {
                error.value = data.message || 'Failed to send verification code';
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
    async function verifyCode(phoneNumber, code) {
        isLoading.value = true;
        error.value = null;
        successMessage.value = '';

        try {
            const response = await apiService.verifyCode({ phoneNumber, code_verify: code });
            const data = response.data;

            if (data.code === '1000') {
                const { token, refreshToken: newRefreshToken } = data.data;
                setTokens(token, newRefreshToken);
                await fetchUserProfile();
                successMessage.value = 'Verification successful';
                return true;
            } else {
                error.value = data.message || 'Verification failed';
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
        if (!accessToken.value) {
            clearUserData();
            return;
        }

        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiService.getUserProfile();
            const data = response.data;

            if (data.code === '1000') {
                setUserData(data.data);
            } else {
                error.value = data.message || 'Failed to fetch user profile';
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
        const currentRefreshToken = Cookies.get('refreshToken');
        if (!currentRefreshToken) {
            await logout();
            return null;
        }

        try {
            const response = await apiService.refreshToken(currentRefreshToken);
            const data = response.data;

            if (data.code === '1000') {
                const { token: newAccessToken, refreshToken: newRefreshToken } = data.data;
                setTokens(newAccessToken, newRefreshToken);
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
