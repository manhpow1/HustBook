import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '../services/api';
import Cookies from 'js-cookie';
import { useRouter } from 'vue-router';
import logger from '../services/logging';

export const useUserStore = defineStore('user', () => {
    const router = useRouter();
    
    // State
    const user = ref(null);
    const error = ref(null);
    const successMessage = ref('');
    const isLoading = ref(false);
    const cooldownTime = ref(0);
    const cooldownInterval = ref(null);

    // Computed
    const isLoggedIn = computed(() => !!Cookies.get('accessToken'));
    const userInfo = computed(() => user.value);

    // Actions
    const startCooldown = (duration = 60) => {
        cooldownTime.value = duration;
        if (cooldownInterval.value) clearInterval(cooldownInterval.value);
        
        cooldownInterval.value = setInterval(() => {
            if (cooldownTime.value > 0) {
                cooldownTime.value--;
            } else {
                clearInterval(cooldownInterval.value);
            }
        }, 1000);
    };

    const clearAuthState = () => {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        user.value = null;
        error.value = null;
        successMessage.value = '';
        if (cooldownInterval.value) {
            clearInterval(cooldownInterval.value);
        }
    };

    const handleAuthError = (err) => {
        logger.error('Authentication error:', err);
        error.value = err.response?.data?.message || 'An unexpected error occurred';
        isLoading.value = false;
    };

    const setAuthCookies = (token, refreshToken, rememberMe = false) => {
        const tokenExpiry = rememberMe ? 7 : 1/96; // 7 days or 15 minutes
        Cookies.set('accessToken', token, {
            secure: true,
            sameSite: 'strict',
            expires: tokenExpiry
        });
        
        if (refreshToken) {
            Cookies.set('refreshToken', refreshToken, {
                secure: true,
                sameSite: 'strict',
                expires: rememberMe ? 30 : 7 // 30 days if remember me, otherwise 7 days
            });
        }
    };

    const register = async (phoneNumber, password, uuid) => {
        try {
            isLoading.value = true;
            error.value = null;
            
            const response = await apiService.register({ phoneNumber, password, uuid });
            
            if (response.data.code === '1000') {
                const { token, deviceToken } = response.data.data;
                setAuthCookies(token);
                successMessage.value = 'Registration successful! Please verify your account.';
                return true;
            }
            return false;
        } catch (err) {
            handleAuthError(err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const login = async (phoneNumber, password, rememberMe = false) => {
        try {
            isLoading.value = true;
            error.value = null;
            
            const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();
            localStorage.setItem('deviceId', deviceId);
            
            const response = await apiService.login({ phoneNumber, password, deviceId });
            
            if (response.data.code === '1000') {
                const { token, refreshToken, id, userName } = response.data.data;
                setAuthCookies(token, refreshToken, rememberMe);
                user.value = { id, userName, phoneNumber };
                successMessage.value = 'Login successful!';
                return true;
            }
            return false;
        } catch (err) {
            handleAuthError(err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const logout = async () => {
        try {
            isLoading.value = true;
            if (isLoggedIn.value) {
                await apiService.logout();
            }
            clearAuthState();
            router.push('/login');
            return true;
        } catch (err) {
            handleAuthError(err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const refreshToken = async () => {
        try {
            const currentRefreshToken = Cookies.get('refreshToken');
            if (!currentRefreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await apiService.refreshToken(currentRefreshToken);
            
            if (response.data.code === '1000') {
                const { token, refreshToken } = response.data.data;
                setAuthCookies(token, refreshToken);
                return true;
            }
            return false;
        } catch (err) {
            handleAuthError(err);
            await logout();
            return false;
        }
    };

    const checkAuth = async () => {
        try {
            if (!isLoggedIn.value) return false;
            
            const response = await apiService.get('/api/auth/check');
            return response.data.code === '1000';
        } catch (err) {
            if (err.response?.status === 401) {
                // Try to refresh token
                const refreshSuccess = await refreshToken();
                if (refreshSuccess) {
                    // Retry auth check
                    const retryResponse = await apiService.get('/api/auth/check');
                    return retryResponse.data.code === '1000';
                }
            }
            handleAuthError(err);
            return false;
        }
    };

    const getVerifyCode = async (phoneNumber) => {
        try {
            isLoading.value = true;
            error.value = null;
            
            const response = await apiService.getVerifyCode({ phoneNumber });
            
            if (response.data.code === '1000') {
                successMessage.value = 'Verification code sent successfully!';
                startCooldown();
                return true;
            }
            return false;
        } catch (err) {
            handleAuthError(err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const verifyCode = async (phoneNumber, code) => {
        try {
            isLoading.value = true;
            error.value = null;
            
            const response = await apiService.verifyCode({ phoneNumber, code });
            
            if (response.data.code === '1000') {
                const { token } = response.data.data;
                setAuthCookies(token);
                successMessage.value = 'Verification successful!';
                return true;
            }
            return false;
        } catch (err) {
            handleAuthError(err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const updateProfile = async (userName, avatar = null) => {
        try {
            isLoading.value = true;
            error.value = null;

            const formData = new FormData();
            formData.append('userName', userName);
            if (avatar) {
                formData.append('avatar', avatar);
            }

            const response = await apiService.post('/api/auth/change_info_after_signup', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.code === '1000') {
                user.value = { ...user.value, ...response.data.data };
                successMessage.value = 'Profile updated successfully!';
                return true;
            }
            return false;
        } catch (err) {
            handleAuthError(err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    // Initialize auth state from cookies on page load
    const initializeAuth = async () => {
        const token = Cookies.get('accessToken');
        if (token) {
            try {
                const response = await apiService.getUserInfo();
                if (response.data.code === '1000') {
                    user.value = response.data.data;
                }
            } catch (err) {
                logger.error('Error initializing auth:', err);
                clearAuthState();
            }
        }
    };

    // Call initializeAuth when the store is created
    initializeAuth();

    return {
        // State
        user,
        error,
        successMessage,
        isLoading,
        cooldownTime,
        
        // Computed
        isLoggedIn,
        userInfo,
        
        // Actions
        register,
        login,
        logout,
        refreshToken,
        checkAuth,
        getVerifyCode,
        verifyCode,
        updateProfile,
        clearAuthState
    };
});
