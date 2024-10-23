import { useNotificationStore } from '../stores/notificationStore'
import { useRouter } from 'vue-router';

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

export async function handleError(error, router, notificationStore) {
    let message = 'An error occurred.';

    // Debugging error message decision
    console.debug('Evaluating error object for message:', JSON.stringify(error, null, 2));

    if (error.response?.data?.code) {
        const code = error.response.data.code;
        console.debug(`Error Code Found: ${code}`);

        // Special handling for specific codes based on status
        if (
            (code === 1008 || code === 1009) &&
            (error.response.status === 401 || error.response.status === 403)
        ) {
            // For codes 1008 and 1009 with unauthorized status, use a consistent message
            message = errorMessages[1009] || message;
        } else {
            // For all other codes, use the predefined messages
            message = errorMessages[code] || message;
        }
    } else if (error.message) {
        console.debug(`Error Message Found: ${error.message}`);
        message = error.message;
    } else {
        console.debug('Unexpected error structure received.', error);
    }

    // Debug before showing notification
    console.debug(`Displaying notification: "${message}" with type "error"`);
    notificationStore.showNotification(message, 'error');

    // Logging error handling flow
    console.debug('Inside handleError function:', error);

    // Handle redirection for unauthorized or forbidden errors
    if (
        (error.response?.status === 401 || error.response?.status === 403) &&
        (error.response?.data?.code === 1009 || error.response?.data?.code === 1008)
    ) {
        console.debug(`Status ${error.response.status} detected with code ${error.response.data.code}. Redirecting to /login...`);
        try {
            await router.push('/login');
            console.debug('Redirection to /login completed.');
        } catch (routerError) {
            console.error('Router push failed:', routerError);
        }
    } else {
        console.debug('No redirection needed. Status:', error.response?.status);
    }
}