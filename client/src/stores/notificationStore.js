import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiService from '../services/api';
import { useErrorHandler } from '../composables/useErrorHandler';
import logger from '../services/logging';
import { useToast } from '../composables/useToast';
import { useNotifications } from '../composables/useNotification';

export const useNotificationStore = defineStore('notification', () => {
    // State
    const { notifications, badge, lastUpdate, loading, error, unreadCount, fetchNotifications } = useNotifications();
    const newItemsCount = ref(0);
    // Initialize composables
    const { showToast } = useToast();
    const { handleError } = useErrorHandler();

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
            logger.debug('checkNewItems process completed. Loading state:', loading.value);
        }
    }

    function showNotification(message, type = 'info', duration = 5000) {
        const id = Date.now();
        logger.debug(`Showing notification: ${message}`);
        notifications.value.push({ id, message, type, read: false });

        if (process.env.NODE_ENV !== 'test') {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }

    async function markNotificationAsRead(notificationId) {
        try {
            const response = await apiService.setReadNotification(notificationId);
            if (response.data.code === '1000') {
                // Update the local state
                const idx = notifications.value.findIndex((n) => n.notification_id === notificationId);
                if (idx !== -1) {
                    notifications.value[idx].read = '1';
                }
                // Update badge and last_update
                if (response.data.data?.Version) {
                    badge.value = response.data.data.Version.badge;
                    lastUpdate.value = response.data.data.Version.last_update;
                }
                showToast('Notification marked as read.', 'success');
            } else {
                throw new Error(response.data.message || 'Failed to set notification as read');
            }
        } catch (err) {
            await handleError(err);
            showToast('Failed to set notification as read.', 'error');
        }
    }

    async function markAllAsRead() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.setReadNotifications();
            if (response.data.code === '1000') {
                notifications.value = notifications.value.map((n) => ({ ...n, read: true }));
                logger.info('All notifications marked as read');
                showToast('All notifications marked as read.', 'success');
            } else {
                throw new Error(response.data.message || 'Failed to mark notifications as read');
            }
        } catch (err) {
            logger.error('Error marking all notifications as read:', err);
            error.value = 'Failed to mark notifications as read';
            await handleError(err);
            showToast('Failed to mark notifications as read.', 'error');
        } finally {
            loading.value = false;
        }
    }

    async function removeNotification(id) {
        try {
            await apiService.deleteNotification(id);
            notifications.value = notifications.value.filter((n) => n.id !== id);
            showToast('Notification removed.', 'success');
        } catch (error) {
            logger.error(`Failed to remove notification with ID ${id}:`, error);
            showToast('Failed to remove notification.', 'error');
        }
    }

    function resetNewItemsCount() {
        logger.debug('Resetting new items count');
        newItemsCount.value = 0;
    }

    // Expose state and actions
    return {
        // State
        notifications,
        newItemsCount,
        loading,
        error,
        badge,
        lastUpdate,
        unreadCount,
        fetchNotifications,
        checkNewItems,
        markAllAsRead,
        removeNotification,
        resetNewItemsCount,
        showNotification,
        markNotificationAsRead,
    };
});