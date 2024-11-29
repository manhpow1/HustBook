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

    const validateDescription = (description) => {
        if (!description.trim()) {
            descriptionError.value = 'Description cannot be empty';
            return false;
        }
        if (description.length > 500) {
            descriptionError.value = 'Description cannot exceed 500 characters';
            return false;
        }
        descriptionError.value = '';
        return true;
    };

    const validateStatus = (status) => {
        if (!status) {
            statusError.value = 'Status is required';
            return false;
        }
        statusError.value = '';
        return true;
    };

    const validateFiles = (files) => {
        if (!files || files.length === 0) {
            fileError.value = 'At least one image or video is required';
            return false;
        }
        // Add additional file validation if needed
        fileError.value = '';
        return true;
    };

    const validateCode = (codeDigits) => {
        if (codeDigits.some((digit) => !/^\d$/.test(digit))) {
            codeError.value = 'Verification code must be 6 digits';
            return false;
        }
        codeError.value = '';
        return true;
    };

    const validateComment = (comment) => {
        if (!comment.trim()) {
            commentError.value = 'Comment cannot be empty';
            return false;
        }
        if (comment.length > 1000) {
            commentError.value = 'Comment cannot exceed 1000 characters';
            return false;
        }
        commentError.value = '';
        return true;
    };

    return {
        phoneError,
        passwordError,
        descriptionError,
        statusError,
        fileError,
        codeError,
        commentError,
        validatePhone,
        validatePassword,
        validateDescription,
        validateStatus,
        validateFiles,
        validateCode,
        validateComment,
    };
}
