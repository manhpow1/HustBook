import logger from '../services/logging';

function getErrorMessage(code) {
    const errorMessages = {
        9992: 'Post does not exist.',
        9993: 'Verification code is incorrect.',
        9994: 'No data or end of list data.',
        9995: 'User is not validated.',
        9996: 'User exists.',
        9997: 'Method is invalid.',
        9998: 'Token is invalid.',
        9999: 'An unexpected error occurred. Please try again later.',
        1001: 'Cannot connect to the Internet.',
        1002: 'Parameter is not enough.',
        1003: 'Parameter type is invalid.',
        1004: 'Parameter value is invalid.',
        1005: 'Unknown error.',
        1006: 'File size is too big.',
        1007: 'Upload file failed.',
        1008: 'Maximum number of images exceeded.',
        1009: 'You do not have permission to access this resource.',
        1010: 'This action has already been performed by you.',
        1011: 'Could not publish this post.',
        1012: 'Limited access.',
    };
    return errorMessages[code] || 'An error occurred.';
}

function showErrorNotification(notificationStore, message) {
    notificationStore.showNotification(message, 'error');
}

async function redirectToLogin(router) {
    try {
        await router.push('/login');
        logger.info('Redirected to login page');
    } catch (error) {
        logger.error('Router push failed', { error });
    }
}

export async function handleError(error, router) {
    const { useNotificationStore } = await import('../stores/notificationStore');
    const { useUserStore } = await import('../stores/userStore');
    const { useSearchStore } = await import('../stores/searchStore');

    const notificationStore = useNotificationStore();
    const userStore = useUserStore();
    const searchStore = useSearchStore();

    let message = 'An error occurred.';
    const code = error.response?.data?.code;
    const numericCode = parseInt(code, 10);

    if (numericCode) {
        message = getErrorMessage(numericCode);

        // Set the error in searchStore
        searchStore.error = message;

        if (
            [9998, 9999, 1008, 1009, 9995].includes(numericCode) ||
            error.response?.status === 401 ||
            error.response?.status === 403 // Include 403 status code
        ) {
            // Log out user and redirect for security-sensitive errors
            userStore.setUser(null);
            notificationStore.showNotification(message, 'error');
            console.debug('Invalid token or security error detected. Logging out user.');
            await redirectToLogin(router);
            return;
        }

        if (numericCode === 1001 || (error.message && error.message.includes('Network Error'))) {
            message = 'Cannot connect to the Internet.';
            searchStore.error = message;
        }
    } else if (error.message) {
        // Handle errors without specific codes
        message = error.message.includes('Network Error') ? 'Cannot connect to the Internet.' : error.message;
        searchStore.error = message;
    }

    // Show notification
    notificationStore.showNotification(message, 'error');
    console.debug(`Error message set in searchStore: ${searchStore.error}`);
    logger.error('Error occurred', { message, error });
}
