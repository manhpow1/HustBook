import { useNotificationStore } from '../stores/notificationStore'

export const errorMessages = {
    9992: 'The post you are looking for does not exist.',
    9993: 'The verification code is incorrect. Please try again.',
    9994: 'No more data available.',
    9995: 'User not found. Please check your credentials.',
    9996: 'This user already exists. Please try logging in.',
    9997: 'Invalid method. Please try again.',
    9998: 'Your session has expired. Please log in again.',
    9999: 'An unexpected error occurred. Please try again later.',
    1001: 'Unable to connect to the database. Please try again later.',
    1002: 'Missing required information. Please fill in all fields.',
    1003: 'Invalid input type. Please check your entries.',
    1004: 'Invalid input value. Please check your entries.',
    1005: 'An unknown error occurred. Please try again later.',
    1006: 'The file size is too large. Please choose a smaller file.',
    1007: 'Failed to upload file. Please try again.',
    1008: 'You have exceeded the maximum number of images allowed.',
    1009: 'You do not have permission to access this resource.',
    1010: 'You have already performed this action.',
    1011: 'This post could not be published as it violates community standards.',
    1012: 'This content is not available in your country.'
}

export async function handleError(error, router) {
    console.error('[ERROR] handleError:', error);

    const notificationStore = useNotificationStore();
    let message = 'An error occurred.';

    if (error.response && error.response.data && error.response.data.code) {
        const code = error.response.data.code;
        message = errorMessages[code] || message;
    } else if (error.message) {
        message = error.message;
    }

    notificationStore.showNotification(message, 'error');

    if (error.response?.status === 401 && router) {
        console.log('[DEBUG] Calling router.push("/login") inside handleError.');
        await router.push('/login');  // Ensure async behavior is awaited.
    } else {
        console.log('[DEBUG] Not redirecting. Status:', error.response?.status);
    }
}