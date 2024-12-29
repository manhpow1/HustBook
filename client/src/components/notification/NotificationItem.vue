<template>
    <div @click="handleMarkAsRead"
        :class="['flex items-center p-2 rounded-md cursor-pointer', { 'bg-blue-50': notification.read === '0' }]">
        <div class="flex-shrink-0">
            <img :src="notification.avatar" alt="Notification Avatar" class="h-10 w-10 rounded-full object-cover" />
        </div>
        <div class="ml-3 flex-1">
            <p class="text-sm font-medium text-gray-900">{{ notification.title }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ formattedTime }}</p>
        </div>
        <div class="ml-4 flex-shrink-0">
            <button @click.stop="handleRemove"
                class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label="Remove Notification">
                <XIcon class="h-5 w-5" aria-hidden="true" />
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { XIcon } from 'lucide-vue-next';
import { useNotificationStore } from '../../stores/notificationStore';
import { formatNotificationTime } from '../../utils/helpers';
import { useErrorHandler } from '@/utils/errorHandler';
import { useToast } from '../ui/toast';

const props = defineProps({
    notification: {
        type: Object,
        required: true
    }
});

const notificationStore = useNotificationStore();
const { handleError } = useErrorHandler();
const { toast } = useToast();

const formattedTime = computed(() => formatNotificationTime(props.notification.created));

const handleRemove = async () => {
    try {
        await notificationStore.removeNotification(props.notification.notificationId);
        toast({ type: 'success', message: 'Notification removed.' });
    } catch (error) {
        await handleError(error);
        toast({ type: 'error', message: 'Failed to remove notification.' });
    }
};

const handleMarkAsRead = async () => {
    if (props.notification.read === '0') {
        try {
            await notificationStore.markNotificationAsRead(props.notification.notificationId);
        } catch (error) {
            await handleError(error);
        }
    }
};
</script>