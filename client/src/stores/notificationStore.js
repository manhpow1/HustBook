import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiService from '../services/api';
import { handleError } from '../utils/errorHandler';
import router from '../router';

export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref([]);
    const newItemsCount = ref(0);
    const loading = ref(false);
    const error = ref(null);

    async function checkNewItems(lastId, categoryId = '0') {
        console.debug(`Initiating checkNewItems with lastId: ${lastId}, categoryId: ${categoryId}`);
        loading.value = true;
        error.value = null;

        try {
            const response = await apiService.checkNewItems(lastId, categoryId);
            console.debug('Received response from checkNewItems API:', response);

            if (response.code === '1000') {
                const newItems = parseInt(response.data.new_items, 10);
                newItemsCount.value = isNaN(newItems) ? 0 : newItems;
                console.log(`New items count updated to: ${newItemsCount.value}`);
            } else {
                console.error('API responded with an error:', response.message);
                error.value = response.message;
                if (process.env.NODE_ENV === 'development') {
                    await handleError(new Error(response.message), router);
                }
            }
        } catch (err) {
            console.error('Error occurred in checkNewItems:', err);
            error.value = 'Failed to check for new items';
            await handleError(err, router);
        } finally {
            loading.value = false;
            console.debug('checkNewItems process completed. Loading state:', loading.value);
        }
    }

    function resetNewItemsCount() {
        console.debug('Resetting new items count');
        newItemsCount.value = 0;
    }

    function showNotification(message, type = 'info', duration = 5000) {
        const id = Date.now();
        console.debug(`Showing notification: ${message}`);
        notifications.value.push({ id, message, type });

        if (process.env.NODE_ENV !== 'test') {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }

    function removeNotification(id) {
        console.debug(`Removing notification with id: ${id}`);
        notifications.value = notifications.value.filter((n) => n.id !== id);
    }

    return {
        newItemsCount,
        loading,
        error,
        notifications,
        showNotification,
        removeNotification,
        checkNewItems,
        resetNewItemsCount,
    };
});
