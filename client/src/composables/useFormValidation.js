import { ref } from 'vue';

export function useFormValidation() {
    const errors = ref({});

    const validateField = (field, value, rules, extraArgs = {}) => {
        const fieldErrors = [];
        rules.forEach(rule => {
            const error = rule(value, extraArgs);
            if (error) fieldErrors.push(error);
        });
        errors.value[field] = fieldErrors;
        return fieldErrors.length === 0;
    };

    const passwordRules = [
        (value) => (value.length < 8 || value.length > 30) ? 'Password must be 8-30 characters long.' : null,
        (value) => !/[a-z]/.test(value) ? 'Password must contain at least one lowercase letter.' : null,
        (value) => !/[A-Z]/.test(value) ? 'Password must contain at least one uppercase letter.' : null,
        (value) => !/\d/.test(value) ? 'Password must contain at least one number.' : null,
        (value) => /[^a-zA-Z0-9]/.test(value) ? 'Password must contain only letters and numbers.' : null,
        (value) => /(.)\1{2,}/.test(value) ? 'Password cannot contain characters repeated more than twice.' : null,
        (value) => /^(?:abc|123|password|admin|user|login|welcome|qwerty|asdfgh|zxcvbn)/i.test(value) ? 'Password cannot contain common patterns.' : null,
        (value, { phoneNumber }) => value === phoneNumber ? 'Password cannot match the phone number.' : null,
    ];

    const phoneNumberRules = [
        (value) => !value ? 'Phone number is required.' : null,
        (value) => !/^0\d{9}$/.test(value) ? 'Phone number must start with 0 and be 10 digits long.' : null,
    ];

    const usernameRules = [
        (value) => !value ? 'Username is required.' : null,
        (value) => value.length < 3 ? 'Username must be at least 3 characters long.' : null,
        (value) => value.length > 30 ? 'Username cannot exceed 30 characters.' : null,
        (value) => !/^[a-zA-Z0-9_]+$/.test(value) ? 'Username can only contain letters, numbers, and underscores.' : null,
    ];

    const validatePassword = (password, phoneNumber) => {
        return validateField('password', password, passwordRules, { phoneNumber });
    };

    const validatePhoneNumber = (phoneNumber) => {
        return validateField('phoneNumber', phoneNumber, phoneNumberRules);
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
