import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Cookies from 'js-cookie';
import { useUserStore } from '../stores/userStore';
import { useRouter } from 'vue-router';
import { useToast } from './useToast';
import { useErrorHandler } from './useErrorHandler';
import { useFormValidation } from './useFormValidation';

export function useAuth() {
    const userStore = useUserStore();
    const router = useRouter();
    const { handleError } = useErrorHandler();
    const { showToast } = useToast();
    const { validateField, validators } = useFormValidation();

    // Basic validations
    const validatePhoneNumber = async (phoneNumber) => {
        return validateField('phoneNumber', phoneNumber, validators.phoneNumber);
    };

    const validatePassword = async (password, phoneNumber) => {
        return validateField('password', password, [
            ...validators.password,
            value => value === phoneNumber ? 'Password cannot match phone number' : null
        ]);
    };

    const validateVerificationCode = async (code) => {
        return validateField('verificationCode', code, [
            value => !value ? 'Verification code is required' : null,
            value => !/^\d{6}$/.test(value) ? 'Verification code must be 6 digits' : null
        ]);
    };

    // Auth state
    const isAuthenticated = computed(() => userStore.isLoggedIn);
    const currentUser = computed(() => userStore.user);
    const authLoading = computed(() => userStore.isLoading);
    const authError = computed(() => userStore.error);

    // Session management
    const sessionExpiryTimer = ref(null);
    const sessionWarningTimer = ref(null);
    const sessionWarningShown = ref(false);
    const deviceId = ref(localStorage.getItem('deviceId') || crypto.randomUUID());

    // Rate limiting
    const attemptsRemaining = ref(5);
    const lockoutEndTime = ref(null);
    const isLockedOut = computed(() => {
        if (!lockoutEndTime.value) return false;
        return Date.now() < lockoutEndTime.value;
    });

    // Auth operations
    // Session monitoring
    const setupSessionMonitoring = () => {
        const token = Cookies.get('accessToken');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiryTime = payload.exp * 1000;
            const warningTime = expiryTime - (5 * 60 * 1000); // 5 minutes before expiry
            const now = Date.now();

            if (warningTime > now) {
                sessionWarningTimer.value = setTimeout(() => {
                    showToast('Your session will expire soon. Please re-login.', 'warning');
                    sessionWarningShown.value = true;
                }, warningTime - now);
            }

            if (expiryTime > now) {
                sessionExpiryTimer.value = setTimeout(async () => {
                    const refreshed = await refreshToken();
                    if (!refreshed) {
                        await logout(true);
                        showToast('Session expired. Please login again.', 'error');
                    }
                }, expiryTime - now - 60000); // Refresh 1 minute before expiry
            }
        }
    };

    const clearSessionTimers = () => {
        if (sessionWarningTimer.value) clearTimeout(sessionWarningTimer.value);
        if (sessionExpiryTimer.value) clearTimeout(sessionExpiryTimer.value);
        sessionWarningShown.value = false;
    };

    // Rate limiting
    const handleFailedAttempt = () => {
        attemptsRemaining.value--;
        if (attemptsRemaining.value <= 0) {
            lockoutEndTime.value = Date.now() + (5 * 60 * 1000); // 5 minutes lockout
            showToast('Too many attempts. Please try again later.', 'error');
            setTimeout(() => {
                attemptsRemaining.value = 5;
                lockoutEndTime.value = null;
            }, 5 * 60 * 1000);
        }
    };

    const login = async (phoneNumber, password, rememberMe = false, useBiometric = false) => {
        try {
            await validatePhoneNumber(phoneNumber);
            await validatePassword(password);

            if (isLockedOut.value) {
                const remainingTime = Math.ceil((lockoutEndTime.value - Date.now()) / 1000);
                showToast(`Please wait ${remainingTime} seconds before trying again`, 'error');
                return false;
            }

            let credentials;
            if (useBiometric && isBiometricAvailable.value) {
                try {
                    credentials = await getBiometricCredentials(phoneNumber);
                } catch (error) {
                    showToast('Biometric authentication failed', 'error');
                    return false;
                }
            }

            localStorage.setItem('deviceId', deviceId.value);
            const success = await userStore.login(
                phoneNumber, 
                credentials?.signature || password, 
                rememberMe,
                deviceId.value,
                credentials?.type === 'biometric'
            );

            if (success) {
                attemptsRemaining.value = 5;
                setupSessionMonitoring();
                showToast('Login successful!', 'success');
                return router.push({ name: 'Home' });
            }

            handleFailedAttempt();
            showToast(userStore.error || 'Login failed', 'error');
        } catch (error) {
            handleError(error);
        }
    };

    const forgotPassword = async (phoneNumber, code = null, newPassword = null) => {
        try {
            await validatePhoneNumber(phoneNumber);
            
            if (newPassword) {
                await validatePassword(newPassword, phoneNumber);
                await validateVerificationCode(code);
            }

            const success = await userStore.forgotPassword(phoneNumber, code, newPassword);
            if (success) {
                const message = newPassword 
                    ? 'Password reset successfully!'
                    : 'Verification code sent successfully!';
                showToast(message, 'success');
                return true;
            }
            
            showToast(userStore.error || 'Operation failed', 'error');
            return false;
        } catch (error) {
            handleError(error);
            return false;
        }
    };

    const register = async (phoneNumber, password) => {
        try {
            await validatePhoneNumber(phoneNumber);
            await validatePassword(password, phoneNumber);

            const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();
            localStorage.setItem('deviceId', deviceId);

            const success = await userStore.register(phoneNumber, password, deviceId);
            if (success) {
                showToast('Registration successful! Please verify your account.', 'success');
                return true;
            }
            showToast(userStore.error || 'Registration failed', 'error');
            return false;
        } catch (error) {
            handleError(error);
            return false;
        }
    };

    const verifyCode = async (phoneNumber, code) => {
        try {
            await validatePhoneNumber(phoneNumber);
            await validateVerificationCode(code);

            const success = await userStore.verifyCode(phoneNumber, code);
            if (success) {
                showToast('Verification successful!', 'success');
                return true;
            }
            showToast(userStore.error || 'Verification failed', 'error');
            return false;
        } catch (error) {
            handleError(error);
            return false;
        }
    };

    const logout = async (suppressRedirect = false) => {
        try {
            clearSessionTimers();
            await userStore.logout(deviceId.value);
            showToast('Logged out successfully', 'success');
            if (!suppressRedirect) {
                router.push({ name: 'Login' });
            }
        } catch (error) {
            handleError(error);
        }
    };

    const requestVerificationCode = async (phoneNumber) => {
        try {
            await validatePhoneNumber(phoneNumber);
            
            const success = await userStore.getVerifyCode(phoneNumber);
            if (success) {
                showToast('Verification code sent successfully!', 'success');
                return true;
            }
            showToast(userStore.error || 'Failed to send verification code', 'error');
            return false;
        } catch (error) {
            handleError(error);
            return false;
        }
    };

    const updateProfile = async (userData) => {
        try {
            const success = await userStore.updateProfile(userData);
            if (success) {
                showToast('Profile updated successfully!', 'success');
                return true;
            }
            showToast(userStore.error || 'Failed to update profile', 'error');
            return false;
        } catch (error) {
            handleError(error);
            return false;
        }
    };

    // Auth guards
    // Token refresh
    const refreshToken = async () => {
        try {
            const refreshToken = Cookies.get('refreshToken');
            if (!refreshToken) return false;

            const success = await userStore.refreshToken(refreshToken, deviceId.value);
            if (success) {
                setupSessionMonitoring();
                return true;
            }
            return false;
        } catch (error) {
            handleError(error);
            return false;
        }
    };

    // Auth guards with network connectivity check
    const requireAuth = async () => {
        if (!navigator.onLine) {
            showToast('No internet connection. Please check your network.', 'error');
            return;
        }

        if (!isAuthenticated.value) {
            showToast('Please login to continue', 'error');
            router.push({ 
                name: 'Login',
                query: { 
                    redirect: router.currentRoute.value.fullPath,
                    deviceId: deviceId.value
                }
            });
        }
    };

    const redirectIfAuthenticated = async () => {
        if (isAuthenticated.value) {
            router.push({ name: 'Home' });
        }
    };

    // Lifecycle hooks
    onMounted(() => {
        setupSessionMonitoring();
        
        // Network status monitoring
        window.addEventListener('online', () => {
            if (sessionWarningShown.value) {
                refreshToken();
            }
        });
    });

    onUnmounted(() => {
        clearSessionTimers();
    });

    // Watch for token changes
    watch(() => userStore.isLoggedIn, (newValue) => {
        if (newValue) {
            setupSessionMonitoring();
        } else {
            clearSessionTimers();
        }
    });

    return {
        // State
        deviceId,
        attemptsRemaining,
        isLockedOut,
        // State
        isAuthenticated,
        currentUser,
        authLoading,
        authError,

        // Validations
        validatePhoneNumber,
        validatePassword,
        validateVerificationCode,

        // Operations
        login,
        register,
        logout,
        verifyCode,
        requestVerificationCode,
        updateProfile,
        forgotPassword,

        // Guards
        requireAuth,
        redirectIfAuthenticated
    };
}
