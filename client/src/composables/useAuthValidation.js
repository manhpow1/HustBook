import { ref, computed, watch } from 'vue';
import { useDebounce } from './useDebounce';

export function useAuthValidation() {
    // -------------------------------------------------------------------------
    // Main "fields" for the form.
    // By default, this includes phoneNumber, password, confirmPassword,
    // userName, and a 6-digit verification code array, etc.
    // -------------------------------------------------------------------------
    const fields = ref({
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        userName: '',
        code: Array(6).fill(''), // 6-digit code for "verify" step
    });

    // -------------------------------------------------------------------------
    // Validation state
    // -------------------------------------------------------------------------
    const errors = ref({});
    const touchedFields = ref(new Set());
    const visitedFields = ref(new Set());
    const isValidating = ref(false);

    // Computed flags
    const hasErrors = computed(() => Object.keys(errors.value).length > 0);
    const isDirty = computed(() => touchedFields.value.size > 0);
    const isValid = computed(() => !hasErrors.value && isDirty.value);
    const isPristine = computed(() => touchedFields.value.size === 0);

    // -------------------------------------------------------------------------
    // Validation Rules
    // -------------------------------------------------------------------------
    const validationRules = {
        phoneNumber: [
            (value) => !value?.trim() && 'Phone number is required',
            (value) => !/^0\d{9}$/.test(value) && 'Phone number must be 10 digits and start with 0',
        ],
        password: [
            (value) => !value?.trim() && 'Password is required',
            (value) => value?.length < 8 && 'Password must be at least 8 characters',
            (value) => value?.length > 30 && 'Password must be at most 30 characters',
            (value) => !/[A-Z]/.test(value) && 'Password must contain at least one uppercase letter',
            (value) => !/[a-z]/.test(value) && 'Password must contain at least one lowercase letter',
            (value) => !/\d/.test(value) && 'Password must contain at least one number',
            (value) =>
                !/[!@#$%^&*]/.test(value) &&
                'Password must contain at least one special character (!@#$%^&*)',
            (value, { phoneNumber }) =>
                value === phoneNumber && 'Password cannot match phone number',
        ],
        confirmPassword: [
            (value, { password }) => value !== password && 'Passwords must match',
        ],
        verificationCode: [
            (value) =>
                !value.every((digit) => /^\d$/.test(digit)) && 'Verification code must be 6 digits',
        ],
        userName: [
            (value) => !value?.trim() && 'Username is required',
            (value) => value?.length < 3 && 'Username must be at least 3 characters',
            (value) => value?.length > 30 && 'Username must be at most 30 characters',
            (value) =>
                !/^[a-zA-Z0-9_]+$/.test(value) &&
                'Username can only contain letters, numbers, and underscores',
        ],
    };

    // -------------------------------------------------------------------------
    // Validate a single field
    // -------------------------------------------------------------------------
    const validateFormField = async (fieldName, value = fields.value[fieldName]) => {
        touchedFields.value.add(fieldName);
        const fieldRules = validationRules[fieldName] || [];

        for (const rule of fieldRules) {
            const errorMessage = rule(value, fields.value);
            if (errorMessage) {
                errors.value[fieldName] = errorMessage;
                return false;
            }
        }

        // No errors
        delete errors.value[fieldName];
        return true;
    };

    // -------------------------------------------------------------------------
    // Debounced validation for smoother user experience
    // -------------------------------------------------------------------------
    const debouncedValidateField = useDebounce((fieldName, value) => {
        validateFormField(fieldName, value);
    }, 300);

    // -------------------------------------------------------------------------
    // Public methods to validate specific fields (if you want to call in <template>)
    // E.g. @input="(val) => validatePhoneNumber(val)"
    // -------------------------------------------------------------------------
    function validatePhoneNumber(val) {
        visitedFields.value.add('phoneNumber');
        debouncedValidateField('phoneNumber', val);
    }

    function validatePassword(val) {
        visitedFields.value.add('password');
        debouncedValidateField('password', val);
    }

    // Example method for confirmPassword, userName, or code if needed:
    function validateConfirmPassword(val) {
        visitedFields.value.add('confirmPassword');
        debouncedValidateField('confirmPassword', val);
    }

    // -------------------------------------------------------------------------
    // Form-level validation (check all fields at once)
    // -------------------------------------------------------------------------
    const validateForm = async () => {
        const fieldNames = Object.keys(validationRules);
        const results = await Promise.all(
            fieldNames.map((fieldName) => validateFormField(fieldName))
        );
        return results.every(Boolean);
    };

    // -------------------------------------------------------------------------
    // Reset or clear
    // -------------------------------------------------------------------------
    const resetValidation = () => {
        errors.value = {};
        touchedFields.value.clear();
        visitedFields.value.clear();
    };

    const clearFields = () => {
        // Reset each field
        fields.value.phoneNumber = '';
        fields.value.password = '';
        fields.value.confirmPassword = '';
        fields.value.userName = '';
        fields.value.code = Array(6).fill('');
        resetValidation();
    };

    // -------------------------------------------------------------------------
    // Field status helper
    // -------------------------------------------------------------------------
    function getFieldStatus(fieldName) {
        return {
            error: errors.value[fieldName],
            touched: touchedFields.value.has(fieldName),
            visited: visitedFields.value.has(fieldName),
            dirty: fields.value[fieldName] !== '',
        };
    }

    function markFieldVisited(fieldName) {
        visitedFields.value.add(fieldName);
    }

    // -------------------------------------------------------------------------
    // Watchers for "phoneNumber" / "password" / "confirmPassword" etc.
    // If you want them automatically validated as the user types,
    // you could do watchers here. Alternatively, rely on the manual calls
    // or <template> event handlers.
    // -------------------------------------------------------------------------
    watch(
        () => fields.value.phoneNumber,
        (newVal) => {
            if (visitedFields.value.has('phoneNumber')) {
                debouncedValidateField('phoneNumber', newVal);
            }
        }
    );

    watch(
        () => fields.value.password,
        (newVal) => {
            if (visitedFields.value.has('password')) {
                debouncedValidateField('password', newVal);

                // If confirmPassword is also set, re-check
                if (fields.value.confirmPassword && visitedFields.value.has('confirmPassword')) {
                    debouncedValidateField('confirmPassword', fields.value.confirmPassword);
                }
            }
        }
    );

    // Add watchers for confirmPassword, userName, code, etc. if you want

    // -------------------------------------------------------------------------
    // Password Strength Analysis (optional)
    // -------------------------------------------------------------------------
    const passwordStrength = computed(() => {
        const pwd = fields.value.password;
        if (!pwd) return 0;

        let strength = 0;
        // Basic lengths
        if (pwd.length >= 8) strength += 10;
        if (pwd.length >= 12) strength += 10;
        if (pwd.length >= 16) strength += 10;

        // Character variety
        if (/[A-Z]/.test(pwd)) strength += 10;
        if (/[a-z]/.test(pwd)) strength += 10;
        if (/\d/.test(pwd)) strength += 10;
        if (/[!@#$%^&*]/.test(pwd)) strength += 10;

        // No triple repeating chars
        if (!/(.)\1{2,}/.test(pwd)) strength += 10;

        // Mixed complexity
        if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(pwd)) {
            strength += 20;
        }

        // Additional checks
        if (!/^[a-zA-Z]/.test(pwd)) strength += 5;
        if (!/[a-zA-Z]$/.test(pwd)) strength += 5;

        return strength;
    });

    const passwordStrengthText = computed(() => {
        const s = passwordStrength.value;
        if (s < 30) return { text: 'Very Weak', color: 'text-red-600' };
        if (s < 50) return { text: 'Weak', color: 'text-orange-600' };
        if (s < 70) return { text: 'Medium', color: 'text-yellow-600' };
        if (s < 90) return { text: 'Strong', color: 'text-blue-600' };
        return { text: 'Very Strong', color: 'text-green-600' };
    });

    const passwordSuggestions = computed(() => {
        const pwd = fields.value.password;
        if (!pwd) return [];

        const suggestions = [];
        if (pwd.length < 12) suggestions.push('Consider using a longer password (12+ characters)');
        if (!/[A-Z]/.test(pwd)) suggestions.push('Add uppercase letters');
        if (!/[a-z]/.test(pwd)) suggestions.push('Add lowercase letters');
        if (!/\d/.test(pwd)) suggestions.push('Add numbers');
        if (!/[!@#$%^&*]/.test(pwd)) suggestions.push('Add special characters (!@#$%^&*)');
        if (/(.)\1{2,}/.test(pwd)) suggestions.push('Avoid repeating characters');
        return suggestions;
    });

    // -------------------------------------------------------------------------
    // Utility for verification code arrays
    // -------------------------------------------------------------------------
    function formatVerificationCode(codeArray) {
        return codeArray.join('');
    }

    // -------------------------------------------------------------------------
    // Return everything
    // -------------------------------------------------------------------------
    return {
        // Main fields object for the entire form
        fields,

        // State
        errors,
        touchedFields,
        visitedFields,
        isValidating,

        // Validation status
        hasErrors,
        isDirty,
        isValid,
        isPristine,

        // Core methods
        validateFormField,
        validateForm,
        resetValidation,
        clearFields,
        getFieldStatus,
        markFieldVisited,

        // Debounced "validate" for phone/password
        validatePhoneNumber,
        validatePassword,
        validateConfirmPassword, // if needed

        // Utility
        formatVerificationCode,

        // Password analysis
        passwordStrength,
        passwordStrengthText,
        passwordSuggestions,
    };
}