<template>
    <div :class="['flex items-center', { 'bg-blue-50': !notification.read }]">
        <div class="flex-shrink-0">
            <img :src="notification.sender.avatar" alt="" class="h-10 w-10 rounded-full" />
        </div>
        <div class="ml-3 w-0 flex-1">
            <p class="text-sm font-medium text-gray-900">{{ notification.sender.name }}</p>
            <p class="text-sm text-gray-500">{{ notification.message }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ formatNotificationTime(notification.createdAt) }}</p>
        </div>
        <div class="ml-4 flex-shrink-0">
            <button @click="removeNotification(notification.id)"
                class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                <span class="sr-only">Remove</span>
                <XIcon class="h-5 w-5" aria-hidden="true" />
            </button>
        </div>
    </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { XIcon } from 'lucide-vue-next';
import { useNotificationStore } from '../../stores/notificationStore';
import { formatNotificationTime } from '../../utils/helpers';

const props = defineProps({
    notification: {
        type: Object,
        required: true
    }
});

const notificationStore = useNotificationStore();

const removeNotification = async (id) => {
    try {
        await notificationStore.removeNotification(id);
        // Show toast message
        // You can use a toast library or implement a custom toast component
        showToast('Notification removed', 'success');
    } catch (error) {
        showToast('Failed to remove notification', 'error');
    }
};

const showToast = (message, type) => {
    // Implement your toast logic here
    console.log(`Toast: ${message} (${type})`);
};
</script>