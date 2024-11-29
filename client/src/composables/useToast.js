import { ref } from 'vue';

export function useToast() {
    const toast = ref({
        message: '',
        type: 'default', // 'success', 'error', 'info', etc.
        isVisible: false,
    });

    const showToast = (message, type = 'default', duration = 3000) => {
        toast.value.message = message;
        toast.value.type = type;
        toast.value.isVisible = true;

        setTimeout(() => {
            toast.value.isVisible = false;
            toast.value.message = '';
            toast.value.type = 'default';
        }, duration);
    };

    return {
        toast,
        showToast,
    };
}