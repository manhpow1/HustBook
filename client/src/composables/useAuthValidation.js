import { ref, computed, watch } from 'vue';
import { useDebounce } from './useDebounce';

export function useAuthValidation(type = 'login') {
    // Use debounced fields for better performance
    const fields = ref({
        phoneNumber: useDebounce('', 300),
        password: useDebounce('', 300),
        code: ['', '', '', '', '', ''],
        userName: useDebounce('', 300),
        confirmPassword: useDebounce('', 300),
    });

    // Validation state
    const errors = ref({});
    const touchedFields = ref(new Set());
    const visitedFields = ref(new Set());
    const isValidating = ref(false);

    // Form validation state computed properties
    const hasErrors = computed(() => Object.keys(errors.value).length > 0);
    const isDirty = computed(() => touchedFields.value.size > 0);
    const isValid = computed(() => !hasErrors.value && isDirty.value);
    const isPristine = computed(() => touchedFields.value.size === 0);

    // Enhanced validation rules matching server-side rules
    const validationRules = {
        phoneNumber: [
            value => !value?.trim() && 'Phone number is required',
            value => !/^0\d{9}$/.test(value) && 'Phone number must be 10 digits and start with 0',
        ],
        password: [
            value => !value?.trim() && 'Password is required',
            value => value?.length < 8 && 'Password must be at least 8 characters',
            value => value?.length > 30 && 'Password must be at most 30 characters',
            value => !/[A-Z]/.test(value) && 'Password must contain at least one uppercase letter',
            value => !/[a-z]/.test(value) && 'Password must contain at least one lowercase letter',
            value => !/\d/.test(value) && 'Password must contain at least one number',
            value => !/[!@#$%^&*]/.test(value) && 'Password must contain at least one special character (!@#$%^&*)',
            (value, { phoneNumber }) => value === phoneNumber && 'Password cannot match phone number',
        ],
        confirmPassword: [
            (value, { password }) => value !== password && 'Passwords must match',
        ],
        verificationCode: [
            value => !value.every(digit => /^\d$/.test(digit)) && 'Verification code must be 6 digits',
        ],
        userName: [
            value => !value?.trim() && 'Username is required',
            value => value?.length < 3 && 'Username must be at least 3 characters',
            value => value?.length > 30 && 'Username must be at most 30 characters',
            value => !/^[a-zA-Z0-9_]+$/.test(value) && 'Username can only contain letters, numbers, and underscores',
        ],
    };

    // Validate a specific field
    const validateFormField = async (fieldName, value = fields.value[fieldName]) => {
        touchedFields.value.add(fieldName);
        const fieldRules = validationRules[fieldName] || [];
        
        for (const rule of fieldRules) {
            const error = rule(value, fields.value);
            if (error) {
                errors.value[fieldName] = error;
                return false;
            }
        }
        
        delete errors.value[fieldName];
        return true;
    };

    // Password strength analysis
    const passwordStrength = computed(() => {
        const password = fields.value.password;
        if (!password) return 0;

        let strength = 0;
        const checks = {
            length: password.length >= 12, // Prefer longer passwords
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*]/.test(password),
            noRepeating: !/(.)\1{2,}/.test(password), // No character repeated more than twice
            mixedChars: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)
        };

        // Base score
        if (password.length >= 8) strength += 10;
        if (password.length >= 12) strength += 10;
        if (password.length >= 16) strength += 10;

        // Character variety
        if (checks.uppercase) strength += 10;
        if (checks.lowercase) strength += 10;
        if (checks.numbers) strength += 10;
        if (checks.special) strength += 10;

        // Advanced patterns
        if (checks.noRepeating) strength += 10;
        if (checks.mixedChars) strength += 20;

        // Additional checks
        if (!/^[a-zA-Z]/.test(password)) strength += 5; // Not starting with letter
        if (!/[a-zA-Z]$/.test(password)) strength += 5; // Not ending with letter

        return strength;
    });

    const passwordStrengthText = computed(() => {
        const strength = passwordStrength.value;
        if (strength < 30) return { text: 'Very Weak', color: 'text-red-600' };
        if (strength < 50) return { text: 'Weak', color: 'text-orange-600' };
        if (strength < 70) return { text: 'Medium', color: 'text-yellow-600' };
        if (strength < 90) return { text: 'Strong', color: 'text-blue-600' };
        return { text: 'Very Strong', color: 'text-green-600' };
    });

    const passwordSuggestions = computed(() => {
        const suggestions = [];
        const password = fields.value.password;
        
        if (!password) return suggestions;
        
        if (password.length < 12) {
            suggestions.push('Consider using a longer password (12+ characters)');
        }
        if (!/[A-Z]/.test(password)) {
            suggestions.push('Add uppercase letters');
        }
        if (!/[a-z]/.test(password)) {
            suggestions.push('Add lowercase letters');
        }
        if (!/\d/.test(password)) {
            suggestions.push('Add numbers');
        }
        if (!/[!@#$%^&*]/.test(password)) {
            suggestions.push('Add special characters (!@#$%^&*)');
        }
        if (/(.)\1{2,}/.test(password)) {
            suggestions.push('Avoid repeating characters');
        }
        
        return suggestions;
    });

    // Verification code handling
    const formatVerificationCode = (code) => code.join('');

    const handleCodeInput = (index, value) => {
        if (value.length > 1) {
            fields.value.code[index] = value.slice(-1);
        } else {
            fields.value.code[index] = value;
        }
        validateFormField('verificationCode');
    };

    const handleCodeKeydown = (event, index) => {
        if (event.key === 'Backspace' && !fields.value.code[index] && index > 0) {
            fields.value.code[index - 1] = '';
            const prevInput = document.querySelector(`input[name="code-${index - 1}"]`);
            prevInput?.focus();
        }
    };

    // Form validation
    const validateForm = async () => {
        const validations = await Promise.all(
            Object.keys(validationRules).map(fieldName => validateFormField(fieldName))
        );
        return validations.every(Boolean);
    };

    const resetValidation = () => {
        errors.value = {};
        touchedFields.value.clear();
        visitedFields.value.clear();
    };

    const clearFields = () => {
        Object.keys(fields.value).forEach(key => {
            if (Array.isArray(fields.value[key])) {
                fields.value[key] = fields.value[key].map(() => '');
            } else {
                fields.value[key] = '';
            }
        });
        resetValidation();
    };

    // Field status helpers
    const getFieldStatus = (fieldName) => ({
        error: errors.value[fieldName],
        touched: touchedFields.value.has(fieldName),
        visited: visitedFields.value.has(fieldName),
        dirty: fields.value[fieldName] !== '',
    });

    // Mark field as visited
    const markFieldVisited = (fieldName) => {
        visitedFields.value.add(fieldName);
    };

    // Form validation watchers
    watch(() => fields.value.password, async (newValue) => {
        if (visitedFields.value.has('password')) {
            await validateFormField('password', newValue);
        }
        if (fields.value.confirmPassword && visitedFields.value.has('confirmPassword')) {
            await validateFormField('confirmPassword', fields.value.confirmPassword);
        }
    });

    watch(() => fields.value.confirmPassword, async (newValue) => {
        if (visitedFields.value.has('confirmPassword')) {
            await validateFormField('confirmPassword', newValue);
        }
    });

    return {
        // Form state
        fields,
        errors,
        touchedFields,
        visitedFields,
        isValidating,

        // Validation methods
        validateField: validateFormField,
        validateForm,
        resetValidation,
        clearFields,
        markFieldVisited,
        getFieldStatus,

        // Validation state
        hasErrors,
        isDirty,
        isValid,
        isPristine,

        // Password validation
        passwordStrength,
        passwordStrengthText,
        passwordSuggestions,

        // Code validation
        formatVerificationCode,
        handleCodeInput,
        handleCodeKeydown,

        // Form type
        formType: type,
    };
}
