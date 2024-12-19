import { useToast } from '../composables/useToast';
import { useUserStore } from '../stores/userStore';
import { useRouter } from 'vue-router';
import logger from '../services/logging';

function errorMessages(code) {
    const errorMessages = {
        '1000': 'OK',
        '9992': 'The requested post does not exist.',
        '9993': 'Verification code is incorrect.',
        '9994': 'No data or end of list data.',
        '9995': 'User is not validated.',
        '9996': 'User already exists.',
        '9997': 'Method is invalid.',
        '9998': 'Token is invalid.',
        '9999': 'Exception error.',
        '1001': 'Cannot connect to the database.',
        '1002': 'Parameter is not enough.',
        '1003': 'Parameter type is invalid.',
        '1004': 'Parameter value is invalid.',
        '1005': 'Unknown error.',
        '1006': 'File size is too big.',
        '1007': 'Upload file failed.',
        '1008': 'Maximum number of images.',
        '1009': 'Not authorized.',
        '1010': 'Action has been done previously by this user.',
        '1011': 'Could not publish this post.',
        '1012': 'Limited access.',
        '1013': 'Please wait before requesting a new verification code.',
    };
    return errorMessages[code] || 'An error occurred.';
}

export async function handleError(error) {
    const { showToast } = useToast();
    const userStore = useUserStore();
    const router = useRouter();

    let message = 'An error occurred. Please try again.';
    const code = error.response?.data?.code;

    if (code) {
        message = errorMessages[code] || error.response.data.message || message;
    } else if (error.message) {
        message = error.message.includes('Network Error') ? 'Cannot connect to the Internet.' : error.message;
    }

    // Log the error
    logger.error('Error occurred', { message, error });

    // Handle specific error codes
    if (['9998', '9999', '1008', '1009', '9995'].includes(code)) {
        // Logout user if token is invalid or access is denied
        userStore.logout();
        showToast(message, 'error');
        await router.push('/login');
        return;
    }

    // Display toast notification for other errors
    showToast(message, 'error');
}
