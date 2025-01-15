import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '../services/api';
import { useErrorHandler } from '@/utils/errorHandler';
import { useToast } from '@/components/ui/toast';
import logger from '../services/logging';

export const useNotificationStore = defineStore('notification', () => {
    // State from both stores
    const notifications = ref([]);
    const badge = ref('0');
    const lastUpdate = ref('');
    const loading = ref(false);
    const error = ref(null);
    const newItemsCount = ref(0);

    const { handleError } = useErrorHandler();
    const { toast } = useToast();

    // Computed 
    const unreadCount = computed(() => {
        return notifications.value.filter((n) => n.read === '0').length;
    });

    // Actions
    async function fetchNotifications(index = 0, count = 20) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.getNotifications(index, count);
            if (response.data.code === '1000') {
                notifications.value = response.data.data.notifications;
                badge.value = response.data.data.badge;
                lastUpdate.value = response.data.data.last_update;
            } else {
                throw new Error(response.data.message || 'Failed to fetch notifications');
            }
        } catch (err) {
            error.value = 'Failed to fetch notifications';
            await handleError(err);
            toast({
                title: "Error",
                description: error.value,
                variant: "destructive"
            });
        } finally {
            loading.value = false;
        }
    }

    async function checkNewItems(lastId, categoryId = '0') {
        logger.debug(`Checking for new items with lastId: ${lastId}, categoryId: ${categoryId}`);
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.checkNewItems(lastId, categoryId);
            if (response.data.code === '1000') {
                const newItems = parseInt(response.data.data.new_items, 10);
                newItemsCount.value = isNaN(newItems) ? 0 : newItems;
                logger.debug(`New items count updated to: ${newItemsCount.value}`);
            } else {
                throw new Error(response.data.message || 'Failed to check new items');
            }
        } catch (err) {
            logger.error('Error checking new items:', err);
            error.value = 'Failed to check for new items';
            await handleError(err);
        } finally {
            loading.value = false;
        }
    }

    async function markAsRead(notificationId) {
        try {
            const response = await apiService.setReadNotification(notificationId);
            if (response.data.code === '1000') {
                const notification = notifications.value.find(n => n.notificationId === notificationId);
                if (notification) {
                    notification.read = '1';
                }
                badge.value = response.data.data.Version?.badge || badge.value;
                lastUpdate.value = response.data.data.Version?.last_update || lastUpdate.value;
            }
        } catch (err) {
            await handleError(err);
            toast({
                title: "Error",
                description: "Failed to mark notification as read",
                variant: "destructive"
            });
        }
    }

    async function markAllAsRead() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.setReadNotifications();
            if (response.data.code === '1000') {
                notifications.value = notifications.value.map((n) => ({ ...n, read: '1' }));
                toast({
                    title: "Success",
                    description: "All notifications marked as read"
                });
            }
        } catch (err) {
            logger.error('Error marking all notifications as read:', err);
            error.value = 'Failed to mark notifications as read';
            await handleError(err);
        } finally {
            loading.value = false;
        }
    }

    async function removeNotification(notificationId) {
        try {
            await apiService.deleteNotification(notificationId);
            notifications.value = notifications.value.filter(
                (n) => n.notificationId !== notificationId
            );
            toast({
                title: "Success",
                description: "Notification removed successfully"
            });
        } catch (error) {
            logger.error(`Failed to remove notification with ID ${notificationId}:`, error);
            toast({
                title: "Error",
                description: "Failed to remove notification",
                variant: "destructive"
            });
        }
    }

    function resetNewItemsCount() {
        logger.debug('Resetting new items count');
        newItemsCount.value = 0;
    }

    function showNotification(message, type = 'info', duration = 5000) {
        const id = Date.now();
        notifications.value.push({
            id,
            message,
            type,
            read: false,
            created: new Date().toISOString()
        });

        if (process.env.NODE_ENV !== 'test') {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }

    return {
        // State
        notifications,
        badge,
        lastUpdate,
        loading,
        error,
        newItemsCount,
        unreadCount,

        // Actions
        fetchNotifications,
        checkNewItems,
        markAsRead,
        markAllAsRead,
        removeNotification,
        resetNewItemsCount,
        showNotification,
    };
});