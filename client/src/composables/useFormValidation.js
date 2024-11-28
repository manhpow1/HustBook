import { ref } from 'vue';

export function useFormValidation() {
    const phoneError = ref('');
    const passwordError = ref('');

    const validatePhone = (phonenumber) => {
        if (!phonenumber) {
            phoneError.value = 'Phone number is required';
            return false;
        }
        if (!/^0\d{9}$/.test(phonenumber)) {
            phoneError.value = 'Invalid phone number format';
            return false;
        }
        phoneError.value = '';
        return true;
    };

    const validatePassword = (password, phonenumber) => {
        if (!password) {
            passwordError.value = 'Password is required';
            return false;
        }
        let errors = [];
        if (password.length < 6 || password.length > 10) {
            errors.push('be 6-10 characters long');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('contain at least one lowercase letter');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('contain at least one uppercase letter');
        }
        if (!/\d/.test(password)) {
            errors.push('contain at least one number');
        }
        if (/[^a-zA-Z0-9]/.test(password)) {
            errors.push('contain only letters and numbers');
        }
        if (password === phonenumber) {
            errors.push('not match the phone number');
        }
        if (errors.length > 0) {
            passwordError.value = `Password must ${errors.join(', and ')}`;
            return false;
        }
        passwordError.value = '';
        return true;
    };

    return {
        phoneError,
        passwordError,
        validatePhone,
        validatePassword,
    };
}
