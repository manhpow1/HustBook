import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import apiService from '../services/api';
import Cookies from 'js-cookie';
import { useRouter } from 'vue-router';
import logger from '../services/logging';
import { useErrorHandler } from '@/utils/errorHandler';
import { useToast } from '@/components/ui/toast';
import { initSocket } from '../services/socket';

// Constants
const INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes
const TOKEN_REFRESH_MARGIN = 60 * 1000; // 1 minute before expiry
const VERIFICATION_CODE_COOLDOWN = 60 * 1000; // 1 minute
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
const DEVICE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const VERIFY_CODE_LENGTH = 6;
const MAX_VERIFY_ATTEMPTS = 5;

export const useUserStore = defineStore('user', () => {
    const router = useRouter();
    const socket = initSocket();
    const { handleError } = useErrorHandler();
    const { toast } = useToast();

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
    const forgotPasswordStep = ref(1);
    const forgotPasswordPhone = ref('');
    const forgotPasswordCode = ref('');
    const securityLevel = ref('standard');
    const lastActivity = ref(Date.now());
    const pendingRefresh = ref(false);
    const verificationAttempts = ref(0);
    const lastVerificationRequest = ref(0);
    const verifyCodeError = ref('');
    const isVerifyCodeExpired = ref(false);
    const remainingAttempts = ref(MAX_VERIFY_ATTEMPTS);

    // Computed
    const isLoggedIn = computed(() => {
        const hasToken = !!Cookies.get('accessToken');
        const hasUser = !!user.value || !!localStorage.getItem('user');
        return hasToken && hasUser;
    });
    const userData = computed(() => user.value);
    const hasVerifiedPhone = computed(() => user.value?.isVerified);
    const isSessionExpired = computed(() => !Cookies.get('accessToken') && !Cookies.get('refreshToken'));
    const deviceCount = computed(() => user.value?.deviceIds?.length || 0);
    const canAddDevice = computed(() => deviceCount.value < 5);
    const formattedLastActivity = computed(() => new Date(lastActivity.value).toLocaleString());
    const isVerified = computed(() => user.value?.isVerified || false);
    const cooldownRemaining = computed(() => cooldownTime.value);
    const lastLoginTime = computed(() => user.value?.lastLoginAt);

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

    const verifyAuthState = async () => {
        logger.debug('Starting auth verification');
        try {
            const token = Cookies.get('accessToken');
            logger.debug(`Token exists: ${!!token}`);

            if (!token) {
                logger.debug('No token found, clearing auth state');
                clearAuthState();
                return false;
            }

            logger.debug('Performing auth check API call');
            const response = await apiService.authCheck();
            logger.debug(`Auth check response code: ${response.data?.code}`);

            if (response.data?.code === '1000') {
                logger.debug('Auth check successful');
                user.value = response.data.user;
                return true;
            }

            logger.debug('Auth check failed, clearing state');
            clearAuthState();
            return false;

        } catch (err) {
            logger.error('Auth verification failed:', err);
            clearAuthState();
            return false;
        }
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
        toast({ type: 'warning', message: 'Session expired due to inactivity' });
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
                    const deviceToken = localStorage.getItem('deviceToken');
                    await apiService.cleanupDevices({
                        deviceId: deviceId.value,
                        deviceToken
                    });
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
        toast({ type: 'error', message: error.value });
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
            expires: 1 / 96 // 15 minutes
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
            toast({ type: 'error', message: 'Account is temporarily locked. Please try again later.' });
            return false;
        }

        try {
            isLoading.value = true;
            error.value = null;

            const uuid = crypto.randomUUID();
            localStorage.setItem('deviceId', deviceId.value);

            const response = await apiService.register({
                phoneNumber,
                password,
                uuid,
                deviceId: deviceId.value,
            });

            if (response.data?.code === '1000') {
                const { token, deviceToken } = response.data.data;
                setAuthCookies(token);
                updateLastActivity();
                successMessage.value = 'Registration successful! Please verify your account.';
                toast({ type: 'success', message: 'Registration successful! Please verify your account.' });
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
            toast({ type: 'error', message: 'Account is temporarily locked. Please try again later.' });
            return false;
        }

        try {
            isLoading.value = true;
            error.value = null;

            const loginData = {
                phoneNumber,
                password,
                deviceId: deviceId.value,
            };

            const response = await apiService.login(loginData);

            if (response.data?.code === '1000') {
                failedAttempts.value = 0;
                const { token, refreshToken, userId, userName, phoneNumber: userPhone, deviceToken } = response.data.data;
                setAuthCookies(token, refreshToken, rememberMe);
                user.value = {
                    userId: userId,
                    userName,
                    phoneNumber: userPhone,
                    isVerified: true, // Server only returns success if verified
                    lastLoginAt: new Date().toISOString()
                };
                localStorage.setItem('deviceToken', deviceToken);
                successMessage.value = 'Login successful!';
                updateLastActivity();
                setupInactivityTimer();
                setupSessionTimeout();
                setupDeviceCleanup();
                localStorage.setItem('user', JSON.stringify(user.value));
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
        toast({ type: 'error', message: errorMessage });
    };

    // Verification Methods
    const startCooldown = () => {
        const now = Date.now();
        lastVerificationRequest.value = now;
        cooldownTime.value = VERIFICATION_CODE_COOLDOWN / 1000;

        if (cooldownInterval.value) {
            clearInterval(cooldownInterval.value);
        }

        cooldownInterval.value = setInterval(() => {
            const elapsed = Date.now() - now;
            const remaining = Math.ceil((VERIFICATION_CODE_COOLDOWN - elapsed) / 1000);

            if (remaining <= 0) {
                cooldownTime.value = 0;
                clearInterval(cooldownInterval.value);
            } else {
                cooldownTime.value = remaining;
            }
        }, 1000);
    };

    const getVerifyCode = async (phoneNumber) => {
        if (isLocked.value) {
            toast({ type: 'error', message: 'Account is temporarily locked. Please try again later.' });
            return false;
        }

        const now = Date.now();
        if (now - lastVerificationRequest.value < VERIFICATION_CODE_COOLDOWN) {
            const remainingTime = Math.ceil(
                (VERIFICATION_CODE_COOLDOWN - (now - lastVerificationRequest.value)) / 1000
            );
            toast({ type: 'error', message: `Please wait ${remainingTime} seconds before requesting a new code` });
            return false;
        }

        try {
            isLoading.value = true;
            error.value = null;
            verifyCodeError.value = '';
            isVerifyCodeExpired.value = false;
            remainingAttempts.value = MAX_VERIFY_ATTEMPTS;

            const response = await apiService.getVerifyCode({ phoneNumber });

            if (response.data.code === '1000') {
                lastVerificationRequest.value = now;
                successMessage.value = 'Verification code sent successfully!';
                toast({ type: 'success', message: successMessage.value });
                startCooldown();
                return {
                    success: true,
                    verifyCode: response.data.data.verifyCode,
                    exists: response.data.data.exists || false
                };
            }
            return { success: false, verifyCode: null, exists: false };
        } catch (err) {
            handleAuthError(err);
            return { success: false, code: null };
        } finally {
            isLoading.value = false;
        }
    };

    const verifyCode = async (phoneNumber, verifyCode) => {
        if (isLocked.value) {
            toast({ type: 'error', message: 'Account is temporarily locked. Please try again later.' });
            return { success: false };
        }

        if (verificationAttempts.value >= MAX_VERIFY_ATTEMPTS) {
            isLocked.value = true;
            setTimeout(() => {
                isLocked.value = false;
                verificationAttempts.value = 0;
            }, LOCKOUT_DURATION);
            toast({ type: 'error', message: 'Too many attempts. Please try again later.' });
            return { success: false };
        }

        try {
            isLoading.value = true;
            error.value = null;
            verifyCodeError.value = '';

            const response = await apiService.verifyCode({
                phoneNumber,
                code: verifyCode,
                deviceId: deviceId.value
            });

            if (response.data.code === '1000') {
                const { verified, exists, token, userId } = response.data.data;

                if (verified) {
                    setAuthCookies(token);
                    user.value = { ...user.value, isVerified: true, userId };
                    verificationAttempts.value = 0;
                    isVerifyCodeExpired.value = false;

                    const message = exists
                        ? 'Verification successful!'
                        : 'Verification successful. Please continue registration!';

                    successMessage.value = message;
                    toast({ type: 'success', message: successMessage.value });

                    return {
                        success: true,
                        exists,
                        verifyCode: response.data.data.verifyCode
                    };
                }
            }

            verificationAttempts.value++;
            return {
                success: false,
                exists: false,
                verifyCode: null
            };
        } catch (err) {
            if (err.response?.data?.code === '9993') {
                verifyCodeError.value = err.response.data.message;

                if (err.response.data.message.includes('expired')) {
                    isVerifyCodeExpired.value = true;
                }

                remainingAttempts.value = Math.max(0, remainingAttempts.value - 1);

                if (remainingAttempts.value === 0) {
                    isLocked.value = true;

                    setTimeout(() => {
                        isLocked.value = false;
                        remainingAttempts.value = MAX_VERIFY_ATTEMPTS;
                    }, LOCKOUT_DURATION);
                }
            }

            handleAuthError(err);
            return { success: false, exists: false };
        } finally {
            isLoading.value = false;
        }
    };


    // Profile Management Methods
    const updateProfile = async (userName, avatarFile) => {
        try {
            const formData = new FormData();
            formData.append('userName', userName);

            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            const response = await apiService.changeInfoAfterSignup(formData);

            if (response.data.code === '1000') {
                user.value = {
                    ...user.value,
                    ...response.data.data
                };
                return {
                    success: true,
                    data: response.data.data
                };
            }
            throw createError(response.data.code, response.data.message);
        } catch (error) {
            logger.error('Update profile error:', error);
            throw error;
        }
    };

    const changePassword = async (currentPassword, newPassword) => {
        if (isLocked.value) {
            toast({ type: 'error', message: 'Account is temporarily locked. Please try again later.' });
            return false;
        }

        try {
            isLoading.value = true;
            error.value = null;

            if (currentPassword === newPassword) {
                error.value = 'New password must be different from current password';
                toast({ type: 'success', message: successMessage.value });
                return false;
            }

            const response = await apiService.changePassword({
                currentPassword,
                newPassword,
                deviceId: deviceId.value
            });

            if (response.data.code === '1000') {
                successMessage.value = 'Password changed successfully!';
                toast({ type: 'success', message: successMessage.value });
                router.push('/login');
                await logout(true);
                router.push('/login');
                return true;
            }

            if (response.data.code === '9992') {
                error.value = 'Password has been used recently. Please choose a different password.';
                toast({ type: 'error', message: error.value });
            }

            return false;
        } catch (err) {
            handleAuthError(err);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    /**
 * Fetches user profile information
 * @param {string|null} userId - Optional user ID. If not provided, fetches current user's profile
 * @returns {Promise<Object|null>} User profile data or null if error occurs
 */
    const getUserProfile = async (userId = null) => {
        try {
            isLoading.value = true;
            error.value = null;

            logger.debug('Fetching user profile', { userId });
            const response = await apiService.getUserInfo(userId);

            if (response.data?.code === '1000') {
                const userData = response.data.data;

                // If fetching current user's profile, update the store
                if (!userId) {
                    user.value = userData;
                }

                logger.debug('User profile fetched successfully', { userId });
                return userData;
            } else {
                throw new Error(response.data?.message || 'Failed to fetch user profile');
            }
        } catch (err) {
            const errorMessage = 'Failed to fetch user profile';
            logger.error(errorMessage, { userId, error: err });
            error.value = errorMessage;
            await handleError(err);
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    /**
 * Updates user profile information
 * @param {Object} updateData - Profile data to update
 * @returns {Promise<boolean>} Success status
 */
    const updateUserProfile = async (updateData) => {
        try {
            const formData = new FormData();
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== null && updateData[key] !== undefined) {
                    if (key === 'avatar' || key === 'coverPhoto') {
                        if (updateData[key] instanceof File) {
                            formData.append(key, updateData[key]);
                        }
                    } else {
                        formData.append(key, updateData[key]);
                    }
                }
            });

            const response = await apiService.setUserInfo(formData);

            if (response.data.code === '1000') {
                // Update local user state
                user.value = {
                    ...user.value,
                    ...response.data.data.user
                };
                return response.data.data;
            }
            throw createError(response.data.code, response.data.message);
        } catch (error) {
            logger.error('Set user info error:', error);
            throw error;
        }
    };

    const fetchUserProfile = async () => {
        return await getUserProfile();
    };

    const forgotPassword = async ({ phoneNumber, code, newPassword }) => {
        try {
            isLoading.value = true;
            error.value = null;

            logger.debug('Initiating password reset:', {
                phoneNumber,
                hasCode: !!code,
                hasNewPassword: !!newPassword
            });

            const payload = { phoneNumber };

            if (code && newPassword) {
                payload.verifyCode = code;
                payload.newPassword = newPassword;
            }

            const response = await apiService.forgotPassword(payload);

            if (response.data?.code === '1000') {
                if (!code && !newPassword) {
                    // Step 1: Get verification code
                    return {
                        success: true,
                        verifyCode: response.data.data.verifyCode
                    };
                } else {
                    // Step 2: Reset password
                    successMessage.value = 'Password reset successfully!';
                    toast({ type: 'success', message: 'Login successful!' });

                    // Clear any stored verification data
                    localStorage.removeItem('resetVerificationCode');
                    localStorage.removeItem('resetPhoneNumber');

                    return { success: true };
                }
            }

            return { success: false };
        } catch (error) {
            logger.error('Password reset error:', error);
            handleError(error);
            return { success: false };
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
        verifyCodeError,
        isVerifyCodeExpired,
        remainingAttempts,

        // Computed
        isLoggedIn,
        userData,
        hasVerifiedPhone,
        isSessionExpired,
        deviceCount,
        canAddDevice,
        formattedLastActivity,
        isVerified,
        cooldownRemaining,
        lastLoginTime,

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
        startCooldown,
        forgotPassword,
        verifyAuthState,
        getUserProfile,
        updateUserProfile,
        fetchUserProfile,
    };
});
