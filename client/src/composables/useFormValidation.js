import { ref } from 'vue';

export function useFormValidation() {
    const errors = ref({});
    const descriptionError = ref('');
    const statusError = ref('');
    const fileError = ref('');

    const validateField = (field, value, rules, context = {}, immediate = false) => {
        // Always validate if immediate is true
        if (!immediate && value === '') {
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

    const validateDescription = (description) => {
        if (!description || description.trim() === '') {
            descriptionError.value = 'Description cannot be empty';
            return false;
        }
        if (description.length > 1000) {
            descriptionError.value = 'Description must not exceed 1000 characters';
            return false;
        }
        descriptionError.value = '';
        return true;
    };

    const validateStatus = (status) => {
        if (!status) {
            statusError.value = 'Please select a status';
            return false;
        }
        statusError.value = '';
        return true;
    };

    const validateFiles = (files) => {
        if (!files) return true;

        if (files.length > 4) {
            fileError.value = 'Maximum 4 files allowed';
            return false;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        for (const file of files) {
            if (!validTypes.includes(file.type)) {
                fileError.value = 'Only image files (JPEG, PNG, GIF) are allowed';
                return false;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                fileError.value = 'File size must not exceed 5MB';
                return false;
            }
        }
        fileError.value = '';
        return true;
    };


    const clearErrors = (field) => {
        const allowedFields = ['phoneNumber', 'description', 'status', 'files', 'newPassword', 'currentPassword', 'confirmPassword', 'username', 'password'];

        if (field) {
            if (!allowedFields.includes(field)) {
                console.warn(`Invalid field: ${field}`);
                return;
            }
            errors.value[field] = [];
        } else {
            errors.value = {};
        }

        if (!field || field === 'description') descriptionError.value = '';
        if (!field || field === 'status') statusError.value = '';
        if (!field || field === 'files') fileError.value = '';
    };

    return {
        errors,
        descriptionError,
        statusError,
        fileError,
        validatePassword,
        validatePhoneNumber,
        validateUsername,
        validateDescription,
        validateStatus,
        validateFiles,
        validateField,
        clearErrors,
    };
}
