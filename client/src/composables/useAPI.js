import { ref } from 'vue';
import axios from 'axios';
import { useErrorHandler } from '@/utils/errorHandler';

export function useApi(onSuccess = () => { }) {
    const isLoading = ref(false);
    const data = ref(null);
    const error = ref(null);
    const { handleError } = useErrorHandler();
    const request = async (config) => {
        isLoading.value = true;
        error.value = null;
        data.value = null;
        try {
            const response = await axios(config);
            data.value = response.data;
            await onSuccess(response.data);
        } catch (err) {
            await handleError(err);
            error.value = err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        data,
        error,
        request,
    };
}