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
    const user = ref(JSON.parse(localStorage.getItem('user')) || null);
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
    const isSessionExpired = computed(() => !Cookies.get('accessToken'));
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
            if (!token) {
                await clearAuthState();
                return false;
            }

            const response = await apiService.authCheck();
            if (response.data?.code === '1000') {
                // Update user state with the authenticated user data
                user.value = response.data.data.user;
                localStorage.setItem('user', JSON.stringify(user.value));
                return true;
            }

            await clearAuthState();
            return false;
        } catch (err) {
            logger.error('Auth verification failed:', err);
            await clearAuthState();
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
        Cookies.remove('accessToken', { path: '/' });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('deviceId');
        localStorage.removeItem('deviceToken');
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
                        await handleSessionExpired();
                    }, timeUntilExpiry);
                }
            } catch (error) {
                logger.error('Error parsing token:', error);
                clearAuthState();
            }
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
    const setAuthCookies = (token, rememberMe = false) => {
        const secure = window.location.protocol === 'https:';
        Cookies.set('accessToken', token, {
            secure,
            sameSite: 'strict',
            path: '/',
            expires: rememberMe ? 7 : 1,
        });
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
                const { token, userId, userName, phoneNumber: userPhone, deviceToken } = response.data.data;
                setAuthCookies(token, null, rememberMe);
                user.value = {
                    userId,
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

        const errorMessage = err.response?.data?.message || 'An unexpected error occurred';
        error.value = errorMessage;
        handleError(err);
        toast({ type: 'error', message: errorMessage });

        // If unauthorized, handle session expiry
        if (err.response?.status === 401) {
            await handleSessionExpired();
        }
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

            // If no userId provided and user data exists, use current user's id
            if (!userId && userData.value?.userId) {
                userId = userData.value.userId;
            }

            if (!userId) {
                throw new Error('No user ID available');
            }

            logger.debug('Fetching profile for user:', { userId });
            const response = await apiService.getProfile(userId);

            if (response.data?.code === '1000') {
                const profileData = response.data.data.user;

                // Update current user data if fetching own profile
                if (userId === userData.value?.userId) {
                    user.value = {
                        ...user.value,
                        ...profileData
                    };
                    logger.debug('Updated current user profile:', user.value);
                }

                return profileData;
            }

            throw new Error(response.data?.message || 'Failed to fetch user profile');
        } catch (err) {
            logger.error('Get user profile failed:', {
                userId,
                error: err,
                currentUser: userData.value
            });
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const updateUserProfile = async (userId, updateData, retryCount = 0) => {
        try {
            isLoading.value = true;
            error.value = null;

            const formData = new FormData();

            // Add version to form data
            formData.append('version', updateData.version);

            // Handle basic fields
            ['userName', 'bio', 'address', 'city', 'country'].forEach(field => {
                if (updateData[field] !== null && updateData[field] !== undefined) {
                    formData.append(field, updateData[field]);
                }
            });

            // Handle avatar
            if (updateData.avatar instanceof File) {
                formData.append('avatar', updateData.avatar);
            } else if (updateData.existingAvatar !== undefined) {
                formData.append('existingAvatar', updateData.existingAvatar);
            }

            // Handle cover photo
            if (updateData.coverPhoto instanceof File) {
                formData.append('coverPhoto', updateData.coverPhoto);
            } else if (updateData.existingCoverPhoto !== undefined) {
                formData.append('existingCoverPhoto', updateData.existingCoverPhoto);
            }

            const response = await apiService.updateProfile(userId, formData);

            if (response.data?.code === '1000') {
                if (userId === user.value?.userId) {
                    user.value = {
                        ...user.value,
                        ...response.data.data.user
                    };
                }
                return response.data.data;
            }

            throw new Error(response.data?.message || 'Failed to update profile');
        } catch (err) {
            if (err.message?.includes('Data was modified by another request') && retryCount < 3) {
                logger.info('Retrying profile update due to version conflict', { retryCount });
                
                // Wait using exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                
                // Fetch latest version and retry
                const latestUser = await getUserProfile(userId);
                return updateUserProfile(userId, {
                    ...updateData,
                    version: latestUser.version
                }, retryCount + 1);
            }
            
            logger.error('Profile update error:', err);
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const fetchUserProfile = async () => {
        try {
            if (!user.value?.userId) {
                throw new Error('No user ID available for fetching profile');
            }
            const userData = await getUserProfile(user.value.userId);
            if (!userData) {
                throw new Error('Failed to fetch user profile');
            }

            return userData;
        } catch (err) {
            logger.error('Failed to fetch user profile:', err);
            throw err;
        }
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
        startCooldown,
        forgotPassword,
        verifyAuthState,
        getUserProfile,
        updateUserProfile,
        fetchUserProfile,
    };
});
