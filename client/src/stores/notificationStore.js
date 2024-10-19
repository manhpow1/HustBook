import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref([]);

    function showNotification(message, type = 'info', duration = 5000) {
        const id = Date.now();
        notifications.value.push({ id, message, type });

        if (process.env.NODE_ENV !== 'test') {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }

    function removeNotification(id) {
        notifications.value = notifications.value.filter((n) => n.id !== id);
    }

    return { notifications, showNotification, removeNotification };
});