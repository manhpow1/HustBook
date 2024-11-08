import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref([]);
    const newItemsCount = ref(0)
    const loading = ref(false)
    const error = ref(null)

    async function checkNewItems(lastId, categoryId = '0') {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.checkNewItem(lastId, categoryId)
            if (response.code === '1000') {
                newItemsCount.value = parseInt(response.data.new_items, 10)
            } else {
                console.error('Error checking for new items:', response.message)
                error.value = response.message
            }
        } catch (err) {
            console.error('Failed to check for new items:', err)
            error.value = 'Failed to check for new items'
        } finally {
            loading.value = false
        }
    }

    function resetNewItemsCount() {
        newItemsCount.value = 0
    }


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