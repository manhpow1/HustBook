import { useAuth } from '../../../composables/useAuth';
import { useAuthValidation } from '../../../composables/useAuthValidation';
import { useAuthForm } from '../../../composables/useAuthForm';
import { useAuthState } from '../../../composables/useAuthState';

// Common configurations
export const AUTH_CONFIG = {
    COOLDOWN_DURATION: 60, // seconds
    CODE_LENGTH: 6,
    MAX_ATTEMPTS: 5,
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes in ms
    PASSWORD_MIN_LENGTH: 6,
    PASSWORD_MAX_LENGTH: 10,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 30,
    AVATAR_MAX_SIZE: 4 * 1024 * 1024, // 4MB
    AUTH_ROUTES: {
        LOGIN: 'Login',
        SIGNUP: 'SignUp',
        VERIFY: 'VerifyCode',
        COMPLETE_PROFILE: 'CompleteProfile',
        HOME: 'Home',
    },
    AUTH_STEPS: {
        LOGIN: 'login',
        SIGNUP: 'signup',
        VERIFY: 'verify',
        COMPLETE_PROFILE: 'complete-profile',
    },
};

// Validation utilities
export const validation = {
    isValidPhoneNumber: (phone) => /^0\d{9}$/.test(phone),
    isValidPassword: (password) => {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const isValidLength = password.length >= AUTH_CONFIG.PASSWORD_MIN_LENGTH && 
                            password.length <= AUTH_CONFIG.PASSWORD_MAX_LENGTH;
        const isValidChars = /^[a-zA-Z0-9]+$/.test(password);
        return hasUpperCase && hasLowerCase && hasNumbers && isValidLength && isValidChars;
    },
    isValidUsername: (username) => {
        return /^[a-zA-Z0-9_]+$/.test(username) &&
            username.length >= AUTH_CONFIG.USERNAME_MIN_LENGTH &&
            username.length <= AUTH_CONFIG.USERNAME_MAX_LENGTH;
    },
    isValidVerificationCode: (code) => {
        return code.length === AUTH_CONFIG.CODE_LENGTH && /^\d+$/.test(code);
    },
};

// Error messages
export const ERROR_MESSAGES = {
    PHONE_REQUIRED: 'Phone number is required',
    PHONE_INVALID: 'Phone number must be 10 digits and start with 0',
    PASSWORD_REQUIRED: 'Password is required',
    PASSWORD_LENGTH: `Password must be ${AUTH_CONFIG.PASSWORD_MIN_LENGTH}-${AUTH_CONFIG.PASSWORD_MAX_LENGTH} characters`,
    PASSWORD_UPPERCASE: 'Password must contain at least one uppercase letter',
    PASSWORD_LOWERCASE: 'Password must contain at least one lowercase letter',
    PASSWORD_NUMBER: 'Password must contain at least one number',
    PASSWORD_CHARS: 'Password must only contain letters and numbers',
    PASSWORD_MATCH_PHONE: 'Password cannot match phone number',
    USERNAME_REQUIRED: 'Username is required',
    USERNAME_LENGTH: `Username must be ${AUTH_CONFIG.USERNAME_MIN_LENGTH}-${AUTH_CONFIG.USERNAME_MAX_LENGTH} characters`,
    USERNAME_CHARS: 'Username can only contain letters, numbers, and underscores',
    CODE_REQUIRED: 'Verification code is required',
    CODE_INVALID: 'Verification code must be 6 digits',
    AVATAR_SIZE: 'Avatar file size is too large (max 4MB)',
    SERVER_ERROR: 'An unexpected error occurred',
    NETWORK_ERROR: 'Network error. Please check your connection',
};

// Reusable setup hooks
export function useAuthSetup(type = AUTH_CONFIG.AUTH_STEPS.LOGIN) {
    const auth = useAuth();
    const form = useAuthForm(type);
    const state = useAuthState();
    const validate = useAuthValidation();

    return {
        auth,
        form,
        state,
        validate,
        config: AUTH_CONFIG,
        validation,
        errors: ERROR_MESSAGES,
    };
}

// Re-export composables for direct access if needed
export {
    useAuth,
    useAuthValidation,
    useAuthForm,
    useAuthState,
};
