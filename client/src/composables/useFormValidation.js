import { ref } from 'vue';

export function useFormValidation() {
    const errors = ref({});

    const validateField = (field, value, rules, context = {}, immediate = false) => {
        // Skip validation if value is empty and not immediate validation
        if (!immediate && !value) {
            return '';
        }
        
        try {
            for (const rule of rules) {
                if (typeof rule === 'function') {
                    const error = rule(value, context);
                    if (error && typeof error === 'string') {
                        return error;
                    }
                }
            }
        } catch (err) {
            console.error('Validation error:', err);
            return 'Validation error occurred';
        }
        return '';
    };

    const passwordRules = [
        (value) => (value.length < 8 || value.length > 30) ? 'Password must be 8-30 characters long.' : '',
        (value) => !/[a-z]/.test(value) ? 'Password must contain at least one lowercase letter.' : '',
        (value) => !/[A-Z]/.test(value) ? 'Password must contain at least one uppercase letter.' : '',
        (value) => !/\d/.test(value) ? 'Password must contain at least one number.' : '',
        (value) => /[^a-zA-Z0-9]/.test(value) ? 'Password must contain only letters and numbers.' : '',
        (value) => /(.)\1{2,}/.test(value) ? 'Password cannot contain characters repeated more than twice.' : '',
        (value) => /^(?:abc|123|password|admin|user|login|welcome|qwerty|asdfgh|zxcvbn)/i.test(value) ? 'Password cannot contain common patterns.' : '',
        (value, context = {}) => value === context?.phoneNumber ? 'Password cannot match the phone number.' : '',
    ];

    const phoneNumberRules = [
        (value) => !value ? 'Phone number is required.' : '',
        (value) => !/^0\d{9}$/.test(value) ? 'Phone number must start with 0 and be 10 digits long.' : '',
    ];

    const usernameRules = [
        (value) => !value ? 'Username is required.' : '',
        (value) => value.length < 3 ? 'Username must be at least 3 characters long.' : '',
        (value) => value.length > 30 ? 'Username cannot exceed 30 characters.' : '',
        (value) => !/^[a-zA-Z0-9_]+$/.test(value) ? 'Username can only contain letters, numbers, and underscores.' : '',
    ];

    const validatePassword = (password, context = {}) => {
        return validateField('password', password, passwordRules, context);
    };

    const validatePhoneNumber = (phoneNumber) => {
        if (!phoneNumber) {
            errors.value.phoneNumber = [];
            return true;
        }
        const error = validateField('phoneNumber', phoneNumber, phoneNumberRules);
        if (error) {
            errors.value.phoneNumber = [error];
            return false;
        }
        errors.value.phoneNumber = [];
        return true;
    };

    const validateUsername = (username) => {
        return validateField('username', username, usernameRules);
    };

    const clearErrors = (field) => {
        if (field) {
            errors.value[field] = [];
        } else {
            errors.value = {};
        }
    };

    return {
        errors,
        validatePassword,
        validatePhoneNumber,
        validateUsername,
        clearErrors,
    };
}
