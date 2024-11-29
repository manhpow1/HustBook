import { ref } from 'vue';

export function useFormValidation() {
    // Error refs
    const errors = ref({});
    const validateField = async (field, value, rules) => {
        for (let rule of rules) {
            const error = await rule(value);
            if (error) {
                errors.value[field] = error;
                return false;
            }
        }
        delete errors.value[field];
        return true;
    };

    // Validation rules
    const validators = {
        phonenumber: [
            (value) => !value ? 'Phone number is required.' : null,
            (value) => !/^0\d{9}$/.test(value) ? 'Invalid phone number format.' : null,
        ],
        password: [
            (value, phonenumber) => !value ? 'Password is required.' : null,
            (value) => value.length < 6 || value.length > 10 ? 'Password must be 6-10 characters long.' : null,
            (value) => !/[a-z]/.test(value) ? 'Password must contain at least one lowercase letter.' : null,
            (value) => !/[A-Z]/.test(value) ? 'Password must contain at least one uppercase letter.' : null,
            (value) => !/\d/.test(value) ? 'Password must contain at least one number.' : null,
            (value) => /[^a-zA-Z0-9]/.test(value) ? 'Password must contain only letters and numbers.' : null,
            (value, phonenumber) => value === phonenumber ? 'Password cannot match the phone number.' : null,
        ],
        description: [
            (value) => !value.trim() ? 'Description cannot be empty.' : null,
            (value) => value.length > 500 ? 'Description cannot exceed 500 characters.' : null,
        ],
        status: [
            (value) => !value ? 'Status is required.' : null,
        ],
        files: [
            (value) => !value || value.length === 0 ? 'At least one image or video is required.' : null,
            // Add more file-specific validations if needed
        ],
        codeDigits: [
            (value) => value.some((digit) => !/^\d$/.test(digit)) ? 'Verification code must be 6 digits.' : null,
        ],
        comment: [
            (value) => !value.trim() ? 'Comment cannot be empty.' : null,
            (value) => value.length > 1000 ? 'Comment cannot exceed 1000 characters.' : null,
        ],
    };

    return {
        errors,
        validateField,
        validators,
    };
}