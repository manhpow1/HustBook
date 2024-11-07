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
    console.log("Entering handleError");
    const notificationStore = useNotificationStore();
    const userStore = useUserStore();
    let message = 'An error occurred.';
    const code = error.response?.data?.code;
    const numericCode = parseInt(code, 10);

    // Check if there's an error code in the response
    if (error.response?.data?.code) {
        const code = error.response.data.code;
        message = getErrorMessage(code);
        logger.debug('Error Code Found', { code, message });

        // Redirect for security-sensitive errors and invalid tokens
        if ([9998, 9999, 1008, 1009, 9995].includes(numericCode) || error.response?.status === 401) {
            console.debug("Setting user to null due to invalid token or security error");
            userStore.setUser(null);
            console.debug("User value after setUser(null):", userStore.user);
            console.debug("isLoggedIn state after setting user to null:", userStore.isLoggedIn);
            notificationStore.showNotification(message, 'error');
            await redirectToLogin(router);
            return;
        }

        // Handle network and connectivity issues separately
        if (code === 1001 || error.message?.includes('Network Error')) {
            message = 'Cannot connect to the Internet.';
        } else if (code === 1010) {
            message = 'This action has already been performed.';
        }

    } else if (error.message) {
        // Handle cases where error has a direct message but no specific code
        logger.debug('Direct error message found', { errorMessage: error.message });
        message = error.message.includes('Network Error') ? 'Cannot connect to the Internet.' : error.message;
    }

    // Display the error message as a notification
    showErrorNotification(notificationStore, message);
    logger.error('Error occurred', { message, error });

    // Additional handling for forbidden access or unclassified errors
    if (error.response?.status === 403) {
        logger.warn('Forbidden access detected');
    } else if (!error.response) {
        // No response indicates a network-related issue
        logger.debug('Network error detected');
    } else {
        logger.info('No redirection needed', { status: error.response.status });
    }
}