import logger from '../services/logging';
import { useUserStore } from '@/stores/userStore';
import router from '../router';
import { useToast } from "@/components/ui/toast";

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

class ErrorHandler {
    constructor() {
        this.criticalErrors = ['9998', '9999', '1008', '1009', '9995'];
        this.toast = useToast();
    }

    get userStore() {
        return useUserStore();
    }

    async handle(error) {
        let message = 'An error occurred. Please try again.';
        const code = error.response?.data?.code;

        if (code) {
            message = errorMessages[code] || error.response.data.message || message;
        } else if (error.message) {
            message = error.message.includes('Network Error') ? 'Cannot connect to the Internet.' : error.message;
        }

        logger.error('Error occurred', { message, error });

        if (this.criticalErrors.includes(code)) {
            await this.handleCriticalError(message);
            return;
        }

        this.toast.toast({
            title: "Error",
            description: message,
            variant: "destructive",
        });
    }

    async handleCriticalError(message) {
        await this.userStore.logout();
        this.toast.toast({
            title: "Critical Error",
            description: message,
            variant: "destructive",
        });
        await router.push('/login');
    }
}

export const errorHandler = new ErrorHandler();

export function useErrorHandler() {
    return {
        handleError: errorHandler.handle.bind(errorHandler)
    };
}