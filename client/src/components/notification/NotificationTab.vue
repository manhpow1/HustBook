<template>
    <div class="relative notification-tab">
        <!-- Notification Icon -->
        <button @click="toggleNotifications"
            class="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            aria-label="Notifications" aria-haspopup="true" :aria-expanded="showNotifications">
            <BellIcon class="h-6 w-6" />
            <span v-if="unreadCount > 0"
                class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                {{ unreadCount }}
            </span>
        </button>

        <!-- Notification Dropdown -->
        <div v-if="showNotifications"
            class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50" role="menu"
            aria-label="Notifications">
            <div class="py-2">
                <div class="px-4 py-2 bg-gray-100 text-gray-800 font-semibold">Notifications</div>
                <div v-if="loading" class="px-4 py-2 text-gray-600">Loading notifications...</div>
                <div v-else-if="error" class="px-4 py-2 text-red-600" role="alert">
                    {{ error }}
                </div>
                <div v-else-if="notifications.length === 0" class="px-4 py-2 text-gray-600">
                    No notifications available.
                </div>
                <template v-else>
                    <NotificationGroup title="Recent" :notifications="recentNotifications" />
                    <NotificationGroup title="Earlier" :notifications="earlierNotifications" />
                </template>
            </div>
            <div v-if="notifications.length > 0" class="px-4 py-2 border-t border-gray-200">
                <button @click="markAllAsRead"
                    class="w-full text-left text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none">
                    Mark all as read
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useNotificationStore } from '../../stores/notificationStore';
import { BellIcon } from 'lucide-vue-next';
import NotificationGroup from './NotificationGroup.vue';
import { useErrorHandler } from '@/utils/errorHandler';
import { useToast } from '../ui/toast';
import { storeToRefs } from 'pinia';

const notificationStore = useNotificationStore();
const { notifications, loading, error, unreadCount } = storeToRefs(notificationStore);
const { handleError } = useErrorHandler();
const { toast } = useToast();

const showNotifications = ref(false);

// Separate notifications into recent and earlier based on today's date
const recentNotifications = computed(() => {
    const today = new Date().toDateString();
    return notifications.value.filter(n => new Date(n.created).toDateString() === today);
});

const earlierNotifications = computed(() => {
    const today = new Date().toDateString();
    return notifications.value.filter(n => new Date(n.created).toDateString() !== today);
});

const toggleNotifications = () => {
    showNotifications.value = !showNotifications.value;
    if (showNotifications.value) {
        fetchNotifications();
    }
};

const fetchNotifications = async () => {
    try {
        // If pagination is needed, pass index and count, e.g. fetchNotifications(0, 20)
        await notificationStore.fetchNotifications();
    } catch (err) {
        handleError(err);
    }
};

const markAllAsRead = async () => {
    try {
        await notificationStore.markAllAsRead();
        toast({ type: 'success', message: 'All notifications marked as read.' });
    } catch (err) {
        handleError(err);
        toast({ type: 'error', message: 'Failed to mark all as read.' });
    }
};

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
    if (!event.target.closest('.notification-tab')) {
        showNotifications.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>