import { reactive, toRefs } from 'vue';

export function useToast() {
    const state = reactive({
        toasts: [], // Array to hold multiple toasts
    });

    const showToast = (message, type = 'default', duration = 3000) => {
        const id = Date.now() + Math.random(); // Unique identifier
        state.toasts.push({ id, message, type, isVisible: true });

        // Automatically remove toast after duration
        const timeout = setTimeout(() => {
            removeToast(id);
        }, duration);

        // Attach timeout ID to toast for potential manual dismissal
        state.toasts = state.toasts.map(toast => {
            if (toast.id === id) {
                return { ...toast, timeout };
            }
            return toast;
        });
    };

    const removeToast = (id) => {
        state.toasts = state.toasts.filter(toast => {
            if (toast.id === id) {
                clearTimeout(toast.timeout); // Clear the timeout to prevent memory leaks
                return false;
            }
            return true;
        });
    };

    return {
        ...toRefs(state),
        showToast,
        removeToast,
    };
}