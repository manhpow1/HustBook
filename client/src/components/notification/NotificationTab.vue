<template>
    <div class="relative">
        <!-- Notification Icon -->
        <button @click="toggleNotifications"
            class="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            aria-label="Notifications">
            <BellIcon class="h-6 w-6" />
            <span v-if="unreadCount > 0"
                class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                {{ unreadCount }}
            </span>
        </button>

        <!-- Notification Dropdown -->
        <div v-if="showNotifications"
            class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50">
            <div class="py-2">
                <div class="px-4 py-2 bg-gray-100 text-gray-800 font-semibold">Notifications</div>
                <div v-if="loading" class="px-4 py-2 text-gray-600">Loading notifications...</div>
                <div v-else-if="error" class="px-4 py-2 text-red-600">{{ error }}</div>
                <div v-else-if="notifications.length === 0" class="px-4 py-2 text-gray-600">No notifications available
                </div>
                <template v-else>
                    <NotificationGroup title="Recent" :notifications="recentNotifications" />
                    <NotificationGroup title="Earlier" :notifications="earlierNotifications" />
                </template>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useNotificationStore } from '../../stores/notificationStore';
import { BellIcon } from 'lucide-vue-next';
import NotificationGroup from './NotificationGroup.vue';

const notificationStore = useNotificationStore();
const showNotifications = ref(false);
const loading = ref(false);
const error = ref(null);

const notifications = computed(() => notificationStore.notifications);
const unreadCount = computed(() => notificationStore.unreadCount);

const recentNotifications = computed(() => {
    const today = new Date().toDateString();
    return notifications.value.filter(n => new Date(n.createdAt).toDateString() === today);
});

const earlierNotifications = computed(() => {
    const today = new Date().toDateString();
    return notifications.value.filter(n => new Date(n.createdAt).toDateString() !== today);
});

const toggleNotifications = () => {
    showNotifications.value = !showNotifications.value;
    if (showNotifications.value) {
        fetchNotifications();
    }
};

const fetchNotifications = async () => {
    loading.value = true;
    error.value = null;
    try {
        await notificationStore.fetchNotifications();
    } catch (err) {
        error.value = 'Failed to load notifications';
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});

const handleClickOutside = (event) => {
    if (!event.target.closest('.notification-tab')) {
        showNotifications.value = false;
    }
};

watch(showNotifications, (newValue) => {
    if (newValue) {
        notificationStore.markAllAsRead();
    }
});
</script>