import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import apiService from '../services/api';
import Cookies from 'js-cookie';
import { useRouter } from 'vue-router';
import logger from '../services/logging';
import { useErrorHandler } from '../composables/useErrorHandler';
import { useToast } from '../composables/useToast';
import { useAuthValidation } from '../composables/useAuthValidation';
import { initSocket } from '../services/socket';

// Constants
const INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes
const TOKEN_REFRESH_MARGIN = 60 * 1000; // 1 minute before expiry
const VERIFICATION_CODE_COOLDOWN = 60 * 1000; // 1 minute
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
const DEVICE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export const useUserStore = defineStore('user', () => {
    const router = useRouter();
    const socket = initSocket();
    const { handleError } = useErrorHandler();
    const { showToast } = useToast();
    const validation = useAuthValidation();

    // State
    const user = ref(null);
    const error = ref(null);
    const successMessage = ref('');
    const isLoading = ref(false);
    const cooldownTime = ref(0);
    const cooldownInterval = ref(null);
    const sessionTimeout = ref(null);
    const inactivityTimer = ref(null);
    const deviceCleanupInterval = ref(null);
    const deviceId = ref(localStorage.getItem('deviceId') || crypto.randomUUID());
    const isLocked = ref(false);
    const failedAttempts = ref(0);
    const securityLevel = ref('standard');
    const lastActivity = ref(Date.now());
    const pendingRefresh = ref(false);
    const verificationAttempts = ref(0);
    const lastVerificationRequest = ref(0);

    // Computed
    const isLoggedIn = computed(() => !!Cookies.get('accessToken'));
    const userInfo = computed(() => user.value);
    const hasVerifiedPhone = computed(() => user.value?.isVerified);
    const isSessionExpired = computed(() => !Cookies.get('accessToken') && !Cookies.get('refreshToken'));
    const deviceCount = computed(() => user.value?.deviceIds?.length || 0);
    const canAddDevice = computed(() => deviceCount.value < 5);
    const formattedLastActivity = computed(() => new Date(lastActivity.value).toLocaleString());
    const isVerified = computed(() => user.value?.isVerified || false);
    const cooldownRemaining = computed(() => cooldownTime.value);
    const lastLoginTime = computed(() => user.value?.lastLoginAt);
    const deviceInfo = computed(() => ({
        id: deviceId.value,
        count: deviceCount.value,
        canAdd: canAddDevice.value
    }));

    // Watchers
    watch(isLoggedIn, (newValue) => {
        if (newValue) {
            setupInactivityTimer();
            setupSessionTimeout();
            setupDeviceCleanup();
            socket.connect();
        } else {
            clearTimers();
            socket.disconnect();
        }
    });

    watch(failedAttempts, (count) => {
        if (count >= 5) {
            isLocked.value = true;
            setTimeout(() => {
                isLocked.value = false;
                failedAttempts.value = 0;
            }, 5 * 60 * 1000); // 5 minute lockout
        }
    });

    // Session Management Methods
    const updateLastActivity = () => {
        lastActivity.value = Date.now();
        localStorage.setItem('lastActivity', lastActivity.value.toString());
    };

    const setupInactivityTimer = () => {
        clearInterval(inactivityTimer.value);
        inactivityTimer.value = setInterval(() => {
            const inactiveTime = Date.now() - lastActivity.value;
            if (inactiveTime > INACTIVITY_THRESHOLD) {
                handleInactivityTimeout();
            }
        }, 60000);
    };

    const handleInactivityTimeout = async () => {
        await logout(true);
        showToast('warning', 'Session expired due to inactivity');
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
    };

    const setupDeviceCleanup = () => {
        clearInterval(deviceCleanupInterval.value);
        deviceCleanupInterval.value = setInterval(async () => {
            try {
                if (isLoggedIn.value) {
                    await apiService.cleanupDevices({ deviceId: deviceId.value });
                }
            } catch (err) {
                logger.error('Device cleanup error:', err);
            }
        }, DEVICE_CLEANUP_INTERVAL);
    };

    const clearTimers = () => {
        clearInterval(inactivityTimer.value);
        clearInterval(deviceCleanupInterval.value);
        clearTimeout(sessionTimeout.value);
        clearInterval(cooldownInterval.value);
    };

    const clearAuthState = () => {
        user.value = null;
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        error.value = null;
        successMessage.value = '';
        failedAttempts.value = 0;
        isLocked.value = false;
        verificationAttempts.value = 0;
        lastVerificationRequest.value = 0;
        clearTimers();
    };

    const setupSessionTimeout = () => {
        const token = Cookies.get('accessToken');
        if (token) {
            try {
                const tokenData = JSON.parse(atob(token.split('.')[1]));
                const expiryTime = tokenData.exp * 1000;
                const timeUntilExpiry = expiryTime - Date.now();
                
                if (timeUntilExpiry > 0) {
                    sessionTimeout.value = setTimeout(async () => {
                        if (!pendingRefresh.value) {
                            await refreshSession();
                        }
                    }, timeUntilExpiry - TOKEN_REFRESH_MARGIN);
                }
            } catch (error) {
                logger.error('Error parsing token:', error);
                clearAuthState();
            }
        }
    };

    const refreshSession = async () => {
        pendingRefresh.value = true;
        try {
            const success = await refreshToken();
            if (!success) {
                await handleSessionExpired();
            }
        } finally {
            pendingRefresh.value = false;
        }
    };

    const handleSessionExpired = async () => {
        await logout(true);
        error.value = 'Session expired. Please login again.';
        showToast('error', error.value);
        router.push({
            path: '/login',
            query: { redirect: router.currentRoute.value.fullPath }
        });
    };

    // Token Management Methods
    const setAuthCookies = (token, refreshToken, rememberMe = false) => {
        const secure = window.location.protocol === 'https:';
        const cookieOptions = {
            secure,
            sameSite: 'strict',
            path: '/'
        };

        Cookies.set('accessToken', token, {
            ...cookieOptions,
            expires: 1/96 // 15 minutes
        });
        
        if (refreshToken) {
            Cookies.set('refreshToken', refreshToken, {
                ...cookieOptions,
                expires: rememberMe ? 30 : 7
            });
        }
    };

    const refreshToken = async () => {
        try {
            const currentRefreshToken = Cookies.get('refreshToken');
            if (!currentRefreshToken) return false;

            const response = await apiService.refreshToken({
                refreshToken: currentRefreshToken,
                deviceId: deviceId.value
            });
            
            if (response.data.code === '1000') {
                const { token, refreshToken } = response.data.data;
                setAuthCookies(token, refreshToken);
                setupSessionTimeout();
                return true;
            }
            return false;
        } catch (err) {
            logger.error('Token refresh error:', err);
            return false;
        }
    };

    // Auth Methods
    const register = async (phoneNumber, password) => {
        if (isLocked.value) {
            showToast('error', 'Account is temporarily locked. Please try again later.');
            return false;
        }

        try {
            isLoading.value = true;
            error.value = null;

            if (!validation.passwordStrength(password)) {
                error.value = 'Password does not meet security requirements';
                showToast('error', error.value);
                return false;
            }
            
            const uuid = crypto.randomUUID();
            localStorage.setItem('deviceId', deviceId.value);
            
            const response = await apiService.register({ 
                phoneNumber, 
                password, 
                uuid,
                deviceId: deviceId.value,
                deviceInfo: {
                    platform: navigator.platform,
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            });
            
            if (response.data?.code === '1000') {
                const { token, deviceToken } = response.data.data;
                setAuthCookies(token);
                updateLastActivity();
                successMessage.value = 'Registration successful! Please verify your account.';
                showToast('success', successMessage.value);
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
        if (isLocked.value) {
            showToast('error', 'Account is temporarily locked. Please try again later.');
            return false;
        }

        try {
            isLoading.value = true;
            error.value = null;
            
            const loginData = { 
                phoneNumber, 
                password, 
                deviceId: deviceId.value,
                deviceInfo: {
                    platform: navigator.platform,
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };
            
            const response = await apiService.login(loginData);
            
            if (response.data?.code === '1000') {
                failedAttempts.value = 0;
                const { token, refreshToken, id, userName, securityLevel: userSecurityLevel } = response.data.data;
                setAuthCookies(token, refreshToken, rememberMe);
                user.value = { id, userName, phoneNumber };
                securityLevel.value = userSecurityLevel || 'standard';
                successMessage.value = 'Login successful!';
                updateLastActivity();
                showToast('success', successMessage.value);
                setupInactivityTimer();
                setupSessionTimeout();
                return true;
            }
            return false;
        } catch (err) {
            failedAttempts.value++;
            handleAuthError(err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const logout = async (suppressRedirect = false) => {
        try {
            isLoading.value = true;
            
            if (isLoggedIn.value) {
                try {
                    await apiService.logout({ deviceId: deviceId.value });
                } catch (err) {
                    logger.error('Logout error:', err);
                }
            }

            clearAuthState();
            socket.disconnect();

            if (!suppressRedirect) {
                router.push('/login');
            }
            return true;
        } catch (err) {
            handleAuthError(err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    const handleAuthError = async (err) => {
        logger.error('Authentication error:', err);
        
        const errorCode = err.response?.data?.code;
        const errorMessage = err.response?.data?.message || 'An unexpected error occurred';

        if (errorCode === '9998' && isLoggedIn.value) {
            if (!pendingRefresh.value) {
                const refreshSuccess = await refreshToken();
                if (!refreshSuccess) {
                    await handleSessionExpired();
                }
            }
            return;
        }

        error.value = errorMessage;
        handleError(err);
        showToast('error', errorMessage);
    };

    // Verification Methods
    const startCooldown = () => {
        cooldownTime.value = VERIFICATION_CODE_COOLDOWN / 1000;
        clearInterval(cooldownInterval.value);
        cooldownInterval.value = setInterval(() => {
            if (cooldownTime.value > 0) {
                cooldownTime.value--;
            } else {
                clearInterval(cooldownInterval.value);
            }
        }, 1000);
    };

    const getVerifyCode = async (phoneNumber) => {
        if (isLocked.value) {
            showToast('error', 'Account is temporarily locked. Please try again later.');
            return false;
        }

        // Check cooldown
        const now = Date.now();
        if (now - lastVerificationRequest.value < VERIFICATION_CODE_COOLDOWN) {
            const remainingTime = Math.ceil((VERIFICATION_CODE_COOLDOWN - (now - lastVerificationRequest.value)) / 1000);
            showToast('error', `Please wait ${remainingTime} seconds before requesting another code`);
            return false;
        }

        try {
            isLoading.value = true;
            error.value = null;
            
            const response = await apiService.getVerifyCode({ phoneNumber });
            
            if (response.data.code === '1000') {
                lastVerificationRequest.value = now;
                successMessage.value = 'Verification code sent successfully!';
                showToast('success', successMessage.value);
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
        if (isLocked.value) {
            showToast('error', 'Account is temporarily locked. Please try again later.');
            return false;
        }

        if (verificationAttempts.value >= 5) {
            isLocked.value = true;
            setTimeout(() => {
                isLocked.value = false;
                verificationAttempts.value = 0;
            }, LOCKOUT_DURATION);
            showToast('error', 'Too many verification attempts. Please try again later.');
            return false;
        }

        try {
            isLoading.value = true;
            error.value = null;
            
            const response = await apiService.verifyCode({ 
                phoneNumber, 
                code,
                deviceId: deviceId.value
            });
            
            if (response.data.code === '1000') {
                const { token, isVerified } = response.data.data;
                setAuthCookies(token);
                user.value = { ...user.value, isVerified };
                successMessage.value = 'Verification successful!';
                showToast('success', successMessage.value);
                verificationAttempts.value = 0;
                return true;
            }
            verificationAttempts.value++;
            return false;
        } catch (err) {
            handleAuthError(err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    // Profile Management Methods
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
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'Device-ID': deviceId.value
                }
            });

            if (response.data.code === '1000') {
                user.value = { ...user.value, ...response.data.data };
                successMessage.value = 'Profile updated successfully!';
                showToast('success', successMessage.value);
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

    const changePassword = async (currentPassword, newPassword) => {
        if (isLocked.value) {
            showToast('error', 'Account is temporarily locked. Please try again later.');
            return false;
        }

        try {
            isLoading.value = true;
            error.value = null;

            if (!validation.passwordStrength(newPassword)) {
                error.value = 'New password does not meet security requirements';
                showToast('error', error.value);
                return false;
            }

            if (currentPassword === newPassword) {
                error.value = 'New password must be different from current password';
                showToast('error', error.value);
                return false;
            }

            const response = await apiService.post('/api/auth/change_password', {
                password: currentPassword,
                new_password: newPassword,
                deviceId: deviceId.value
            });

            if (response.data.code === '1000') {
                successMessage.value = 'Password changed successfully!';
                showToast('success', successMessage.value);
                await logout(true);
                router.push('/login');
                return true;
            }

            if (response.data.code === '9992') {
                error.value = 'Password has been used recently. Please choose a different password.';
                showToast('error', error.value);
            }

            return false;
        } catch (err) {
            handleAuthError(err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        // State
        user,
        error,
        successMessage,
        isLoading,
        isLocked,
        failedAttempts,
        securityLevel,
        verificationAttempts,
        lastVerificationRequest,
        cooldownTime,
        deviceId,

        // Computed
        isLoggedIn,
        userInfo,
        hasVerifiedPhone,
        isSessionExpired,
        deviceCount,
        canAddDevice,
        formattedLastActivity,
        isVerified,
        cooldownRemaining,
        lastLoginTime,
        deviceInfo,

        // Methods
        login,
        logout,
        register,
        getVerifyCode,
        verifyCode,
        updateProfile,
        changePassword,
        updateLastActivity,
        clearAuthState,
        refreshSession,
        startCooldown
    };
});
