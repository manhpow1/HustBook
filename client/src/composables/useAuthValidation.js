import { ref, computed } from 'vue';
import { useFormValidation } from './useFormValidation';

export function useAuthValidation() {
    const { validateField: baseValidateField } = useFormValidation();
    const fields = ref({
        phoneNumber: '',
        password: '',
        code: ['', '', '', '', '', ''],
        userName: '',
    });
    
    const errors = ref({});
    const touchedFields = ref(new Set());

    // Validation rules
    const rules = {
        phoneNumber: [
            value => !value?.trim() && 'Phone number is required',
            value => !/^0\d{9}$/.test(value) && 'Phone number must be 10 digits and start with 0',
        ],
        password: [
            value => !value?.trim() && 'Password is required',
            value => value?.length < 6 && 'Password must be at least 6 characters',
            value => value?.length > 10 && 'Password must be at most 10 characters',
            value => !/[A-Z]/.test(value) && 'Password must contain at least one uppercase letter',
            value => !/[a-z]/.test(value) && 'Password must contain at least one lowercase letter',
            value => !/\d/.test(value) && 'Password must contain at least one number',
            value => /[^a-zA-Z0-9]/.test(value) && 'Password must only contain letters and numbers',
            (value, { phoneNumber }) => value === phoneNumber && 'Password cannot match phone number',
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
        const fieldRules = rules[fieldName] || [];
        
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

    // Password strength indicator
    const passwordStrength = computed(() => {
        const password = fields.value.password;
        if (!password) return 0;

        let strength = 0;
        if (password.length >= 6) strength += 20;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[a-z]/.test(password)) strength += 20;
        if (/\d/.test(password)) strength += 20;
        if (password.length >= 8) strength += 20;

        return strength;
    });

    const passwordStrengthText = computed(() => {
        const strength = passwordStrength.value;
        if (strength <= 20) return 'Very Weak';
        if (strength <= 40) return 'Weak';
        if (strength <= 60) return 'Medium';
        if (strength <= 80) return 'Strong';
        return 'Very Strong';
    });

    const passwordStrengthColor = computed(() => {
        const strength = passwordStrength.value;
        if (strength <= 20) return 'bg-red-500';
        if (strength <= 40) return 'bg-orange-500';
        if (strength <= 60) return 'bg-yellow-500';
        if (strength <= 80) return 'bg-blue-500';
        return 'bg-green-500';
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
            Object.keys(rules).map(fieldName => validateFormField(fieldName))
        );
        return validations.every(Boolean);
    };

    const resetValidation = () => {
        errors.value = {};
        touchedFields.value.clear();
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
        dirty: fields.value[fieldName] !== '',
    });

    return {
        // State
        fields,
        errors,
        touchedFields,

        // Validation
        validateField: validateFormField,
        validateForm,
        resetValidation,
        clearFields,
        getFieldStatus,

        // Password strength
        passwordStrength,
        passwordStrengthText,
        passwordStrengthColor,

        // Verification code
        formatVerificationCode,
        handleCodeInput,
        handleCodeKeydown,

        // Computed
        hasErrors: computed(() => Object.keys(errors.value).length > 0),
        isDirty: computed(() => touchedFields.value.size > 0),
        isValid: computed(() => !Object.keys(errors.value).length && touchedFields.value.size > 0),
    };
}
