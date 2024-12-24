import { ref } from 'vue';

export function useFormValidation() {
    // Reactive object that holds all field errors:
    const errors = ref({});

    // Validate a single field against an array of rules
    const validateField = async (field, value, rules) => {
        for (const rule of rules) {
            // Each rule returns either null (no error) or a string (the error message).
            const error = await rule(value);
            if (error) {
                // Store the error message in errors[field]
                errors.value[field] = error;
                // Return the same error message so the caller can see it if needed
                return error;
            }
        }
        // If we reach here, there's no error for this field
        delete errors.value[field];
        return null;
    };

    // Example rules for each field type
    const validators = {
        phoneNumber: [
            (value) => !value ? 'Phone number is required.' : null,
            (value) => !/^0\d{9}$/.test(value) ? 'Invalid phone number format.' : null,
        ],
        password: [
            (value) => !value ? 'Password is required.' : null,
            (value) => (value.length < 6 || value.length > 10) ? 'Password must be 6-10 characters long.' : null,
            (value) => !/[a-z]/.test(value) ? 'Password must contain at least one lowercase letter.' : null,
            (value) => !/[A-Z]/.test(value) ? 'Password must contain at least one uppercase letter.' : null,
            (value) => !/\d/.test(value) ? 'Password must contain at least one number.' : null,
            (value) => /[^a-zA-Z0-9]/.test(value) ? 'Password must contain only letters and numbers.' : null,
            // For this rule to work, pass phoneNumber as a second arg if you want:
            // (value, phoneNumber) => value === phoneNumber ? 'Password cannot match the phone number.' : null
            // But in that case, you need to call rule(value, phoneNumber) above.
        ],
        description: [
            (value) => !value.trim() ? 'Description cannot be empty.' : null,
            (value) => value.length > 500 ? 'Description cannot exceed 500 characters.' : null,
        ],
        status: [
            (value) => !value ? 'Status is required.' : null,
        ],
        files: [
            (value) => (!value || value.length === 0) ? 'At least one image or video is required.' : null,
        ],
        codeDigits: [
            (value) => value.some(digit => !/^\d$/.test(digit)) ? 'Verification code must be 6 digits.' : null,
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