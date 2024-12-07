import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '../services/api';
import { setAuthHeaders } from '../services/api';
import Cookies from 'js-cookie';
import router from '../router';
import logger from '../services/logging';
import { useErrorHandler } from '../composables/useErrorHandler';

export const useUserStore = defineStore('user', () => {
    // State
    const user = ref(null);
    const isLoading = ref(false);
    const error = ref(null);
    const successMessage = ref('');

    const { handleError } = useErrorHandler();
    // Getters
    const isLoggedIn = computed(() => !!user.value);

    // Initialize tokens from cookies
    const accessToken = ref(Cookies.get('accessToken') || null);
    const refreshToken = ref(Cookies.get('refreshToken') || null);

    // Set default axios headers
    if (accessToken.value) {
        setAuthHeaders(accessToken.value);
    }

    // Actions

    // Set tokens in cookies and axios headers
    function setTokens(newAccessToken, newRefreshToken) {
        accessToken.value = newAccessToken;
        refreshToken.value = newRefreshToken;

        Cookies.set('accessToken', newAccessToken);
        Cookies.set('refreshToken', newRefreshToken);

        setAuthHeaders(newAccessToken);
    }

    // Clear tokens from cookies and axios headers
    function clearTokens() {
        accessToken.value = null;
        refreshToken.value = null;

        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');

        setAuthHeaders(null);
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
    async function login(phoneNumber, password, rememberMe) {
        isLoading.value = true;
        error.value = null;
        successMessage.value = '';

        try {
            const response = await apiService.login({ phoneNumber, password, deviceId: 'device-uuid', rememberMe });
            const data = response.data;

            if (data.code === '1000') {
                const { token, refreshToken: newRefreshToken } = data.data;
                setTokens(token, newRefreshToken);
                await fetchUserProfile();
                successMessage.value = 'Login successful.';
                return true;
            } else {
                error.value = data.message || 'Login failed';
                logger.warn('Login failed', { message: data.message });
                return false;
            }
        } catch (err) {
            handleError(err);
            error.value = err.response?.data?.message || 'An error occurred during login';
            logger.error('Login error', { error: err });
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
                logger.info('Registration successful', { phoneNumber });
                return true;
            } else {
                error.value = data.message || 'Registration failed';
                logger.warn('Registration failed', { message: data.message });
                return false;
            }
        } catch (err) {
            handleError(err);
            error.value = err.response?.data?.message || 'An error occurred during registration';
            logger.error('Registration error', { error: err });
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
            logger.info('User logged out');
            router.push('/login');
            return true;
        } catch (err) {
            handleError(err);
            error.value = 'An error occurred during logout';
            logger.error('Logout error', { error: err });
            return false;
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
                logger.info('Verification code sent', { phoneNumber });
                return true;
            } else {
                error.value = data.message || 'Failed to send verification code';
                logger.warn('Failed to send verification code', { message: data.message });
                return false;
            }
        } catch (err) {
            handleError(err);
            error.value = err.response?.data?.message || 'An error occurred while sending verification code';
            logger.error('GetVerifyCode error', { error: err });
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
                logger.info('Verification successful', { phoneNumber });
                return true;
            } else {
                error.value = data.message || 'Verification failed';
                logger.warn('Verification failed', { message: data.message });
                return false;
            }
        } catch (err) {
            handleError(err);
            error.value = err.response?.data?.message || 'An error occurred during verification';
            logger.error('VerifyCode error', { error: err });
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function getUserProfile(userId = null) {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiService.getUserInfo(userId);
            const data = response.data;

            if (data.code === '1000') {
                // If fetching current user's profile (no userId), store it in user store
                if (!userId) {
                    setUserData(data.data);
                }
                return data.data; // Return the user info data
            } else {
                error.value = data.message || 'Failed to fetch user info';
                return null;
            }
        } catch (err) {
            await handleError(err);
            error.value = err.response?.data?.message || 'An error occurred while fetching user info';
            return null;
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

        const profileData = await getUserProfile(); // no userId means current user
        if (!profileData) {
            clearTokens();
            clearUserData();
        }
    }

    async function updateUserInfo(profileData) {
        isLoading.value = true;
        error.value = null;
        successMessage.value = '';

        try {
            const response = await apiService.setUserInfo(profileData);
            const data = response.data;

            if (data.code === '1000') {
                // Fetch current user profile again to update the store state with the newest data
                await fetchUserProfile();
                successMessage.value = 'Profile updated successfully.';
                return true;
            } else {
                error.value = data.message || 'Failed to update user info';
                logger.warn('Failed to update user info', { message: data.message });
                return false;
            }
        } catch (err) {
            await handleError(err);
            error.value = err.response?.data?.message || 'An error occurred while updating user info';
            logger.error('UpdateUserInfo error', { error: err });
            return false;
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
                logger.info('Access token refreshed');
                return newAccessToken;
            } else {
                await logout();
                logger.warn('Failed to refresh access token', { message: data.message });
                return null;
            }
        } catch (error) {
            handleError(error);
            await logout();
            logger.error('Failed to refresh access token', { error });
            return null;
        }
    }

    // Clear Messages
    function clearMessages() {
        error.value = null;
        successMessage.value = '';
    }

    // Expose state and actions
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
        getUserProfile,
        fetchUserProfile,
        updateUserInfo,
    };
});