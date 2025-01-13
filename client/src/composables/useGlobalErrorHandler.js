import { useErrorHandler } from '@/utils/errorHandler';
import { onMounted, onBeforeUnmount } from 'vue';

export function useGlobalErrorHandler() {
    const { handleError } = useErrorHandler();

    const onError = (event) => {
        event.preventDefault(); // Prevent the default handling
        handleError(event.error || new Error(event.message));
    };

    const onUnhandledRejection = (event) => {
        event.preventDefault();
        handleError(event.reason || new Error('Unhandled promise rejection'));
    };

    onMounted(() => {
        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onUnhandledRejection);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('error', onError);
        window.removeEventListener('unhandledrejection', onUnhandledRejection);
    });
}