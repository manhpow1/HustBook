import { handleError } from '../utils/errorHandler';

export function useErrorHandler() {
    const handle = async (error) => {
        await handleError(error);
    };

    return {
        handleError: handle,
    };
}