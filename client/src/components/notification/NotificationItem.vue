<template>
    <div :class="['flex items-center p-2 rounded-md', { 'bg-blue-50': !notification.read }]">
        <div class="flex-shrink-0">
            <img :src="notification.sender.avatar" alt="Sender Avatar" class="h-10 w-10 rounded-full object-cover" />
        </div>
        <div class="ml-3 flex-1">
            <p class="text-sm font-medium text-gray-900">{{ notification.sender.name }}</p>
            <p class="text-sm text-gray-500">{{ notification.message }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ formattedTime }}</p>
        </div>
        <div class="ml-4 flex-shrink-0">
            <button @click="handleRemove"
                class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label="Remove Notification">
                <XIcon class="h-5 w-5" aria-hidden="true" />
            </button>
        </div>
    </div>
</template>

<script setup>
import { defineProps, computed } from 'vue';
import { XIcon } from 'lucide-vue-next';
import { useNotificationStore } from '../../stores/notificationStore';
import { formatNotificationTime } from '../../utils/helpers';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { useToast } from '../../composables/useToast';

const props = defineProps({
    notification: {
        type: Object,
        required: true
    }
});

const notificationStore = useNotificationStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

// Computed property for formatted time
const formattedTime = computed(() => {
    return formatNotificationTime(props.notification.createdAt);
});

// Handle removing a notification
const handleRemove = async () => {
    try {
        await notificationStore.removeNotification(props.notification.id);
        showToast('Notification removed.', 'success');
    } catch (error) {
        handleError(error);
        showToast('Failed to remove notification.', 'error');
    }
};
</script>