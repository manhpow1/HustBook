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
    const notificationStore = useNotificationStore();
    let message = 'An error occurred.';

    // Determine the error message based on the response or error object
    if (error.response?.data?.code) {
        message = errorMessages[error.response.data.code] || message;
    } else if (error.message) {
        message = error.message;
    }

    // Display notification
    notificationStore.showNotification(message, 'error');
    console.debug('Inside handleError with error:', error);

    // Handle 401 errors by navigating to /login
    if (error.response?.status === 401) {
        if (router && typeof router.push === 'function') {
            console.debug('401 error detected. Redirecting to /login...');
            await router.push('/login');
            console.debug('Router push to /login completed.');
        } else {
            console.error('Router is not defined or missing push method:', router);
        }
    }
}