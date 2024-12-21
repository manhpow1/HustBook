import { computed } from 'vue';
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

    // Auth operations
    const login = async (phoneNumber, password, rememberMe = false) => {
        try {
            await validatePhoneNumber(phoneNumber);
            await validatePassword(password);

            const success = await userStore.login(phoneNumber, password, rememberMe);
            if (success) {
                showToast('Login successful!', 'success');
                return router.push({ name: 'Home' });
            }
            showToast(userStore.error || 'Login failed', 'error');
        } catch (error) {
            handleError(error);
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

    const logout = async () => {
        try {
            await userStore.logout();
            showToast('Logged out successfully', 'success');
            router.push({ name: 'Login' });
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
    const requireAuth = async () => {
        if (!isAuthenticated.value) {
            showToast('Please login to continue', 'error');
            router.push({ 
                name: 'Login',
                query: { redirect: router.currentRoute.value.fullPath }
            });
        }
    };

    const redirectIfAuthenticated = async () => {
        if (isAuthenticated.value) {
            router.push({ name: 'Home' });
        }
    };

    return {
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

        // Guards
        requireAuth,
        redirectIfAuthenticated
    };
}
