import { ref, computed } from 'vue';
import apiService from '../services/api';
import { useErrorHandler } from './useErrorHandler';
import { useToast } from './useToast';

export function useNotifications() {
    const notifications = ref([]);
    const badge = ref('0');
    const lastUpdate = ref('');
    const loading = ref(false);
    const error = ref(null);
    const { handleError } = useErrorHandler();
    const { showToast } = useToast();

    // Fetch notifications using index and count for pagination
    async function fetchNotifications(index = 0, count = 20) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.getNotifications(index, count);
            if (response.data.code === '1000') {
                // The server returns data, badge, last_update
                notifications.value = response.data.data.notifications;
                badge.value = response.data.data.badge;
                lastUpdate.value = response.data.data.last_update;
            } else {
                throw new Error(response.data.message || 'Failed to fetch notifications');
            }
        } catch (err) {
            error.value = 'Failed to fetch notifications';
            await handleError(err);
            showToast(error.value, 'error');
        } finally {
            loading.value = false;
        }
    }

    const unreadCount = computed(() =>
        notifications.value.filter((n) => n.read === '0').length
    );

    return {
        notifications,
        badge,
        lastUpdate,
        loading,
        error,
        unreadCount,
        fetchNotifications
    };
}