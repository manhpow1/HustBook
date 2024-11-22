import { ref } from 'vue';

const message = ref('');
const type = ref('');
const isVisible = ref(false);
let timeout;

export function useToast() {
    const showToast = (msg, toastType = 'default', duration = 3000) => {
        message.value = msg;
        type.value = toastType;
        isVisible.value = true;

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            isVisible.value = false;
        }, duration);
    };

    return {
        message,
        type,
        isVisible,
        showToast,
    };
}

