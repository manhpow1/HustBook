export async function handleError(error, router, notificationStore) {
    let message = 'An error occurred.';

    // Mapping of error codes to messages
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

    // Debugging error message decision
    console.debug('Evaluating error object for message:', JSON.stringify(error, null, 2));

    if (error.response?.data?.code) {
        const code = error.response.data.code;
        console.debug(`Error Code Found: ${code}`);

        // Use the predefined message for the error code
        message = errorMessages[code] || message;

        // Handle specific error codes that require redirection to /login
        if ([9998, 9999, 1008, 1009].includes(code)) {
            console.debug(`Error code ${code} detected. Redirecting to /login...`);
            notificationStore.showNotification(message, 'error');
            try {
                await router.push('/login');
                console.debug('Redirection to /login completed.');
            } catch (routerError) {
                console.error('Router push failed:', routerError);
            }
            return; // Stop further processing after redirection
        }

        // Handle database connection error
        if (code === 1001) {
            message = 'Cannot connect to the Internet.';
            console.debug(`Error code ${code} detected. Displaying message: ${message}`);
            notificationStore.showNotification(message, 'error');
            return; // Stop further processing
        }

        // Handle action already performed (e.g., liking a post twice)
        if (code === 1010) {
            console.debug('Action has already been performed by the user.');
            notificationStore.showNotification(message, 'error');
            return; // Stop further processing
        }

        // Handle other specific error codes as needed
        // Add additional conditions here if necessary
    } else if (error.message) {
        console.debug(`Error Message Found: ${error.message}`);
        if (error.message.includes('Network Error')) {
            message = 'Cannot connect to the Internet.';
        } else {
            message = error.message;
        }
        notificationStore.showNotification(message, 'error');
        return; // Stop further processing
    } else {
        console.debug('Unexpected error structure received.', error);
        notificationStore.showNotification(message, 'error');
        return; // Stop further processing
    }

    // Display the notification
    console.debug(`Displaying notification: "${message}" with type "error"`);
    notificationStore.showNotification(message, 'error');

    // Handle redirection based on HTTP status codes if necessary
    if (error.response?.status === 401) {
        console.debug('Status 401 detected. Redirecting to /login...');
        try {
            await router.push('/login');
            console.debug('Redirection to /login completed.');
        } catch (routerError) {
            console.error('Router push failed:', routerError);
        }
    } else if (error.response?.status === 403) {
        console.debug('Forbidden access detected.');
        // You can add additional handling for status 403 if needed
    } else if (!error.response) {
        console.debug('Network error detected.');
        // Network errors are already handled above
    } else {
        console.debug('No redirection needed. Status:', error.response?.status);
    }
}