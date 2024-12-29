<template>
    <div v-if="newItemsCount > 0"
        class="fixed top-4 right-4 bg-blue-500 text-white p-3 rounded-md cursor-pointer shadow-lg transition-transform duration-300 hover:bg-blue-600"
        @click="handleNotificationClick" tabindex="0" aria-live="polite" role="alert"
        @keydown.enter="handleNotificationClick" @keydown.space.prevent="handleNotificationClick">
        <div class="flex items-center">
            <CirclePlus class="w-6 h-6 mr-2" aria-hidden="true" />
            <span>{{ newItemsCount }} new item{{ newItemsCount !== 1 ? 's' : '' }} available. Click to refresh.</span>
        </div>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useNotificationStore } from '../../stores/notificationStore';
import { usePostStore } from '../../stores/postStore';
import { storeToRefs } from 'pinia';
import { useErrorHandler } from '@/utils/errorHandler';
import { useToast } from '../ui/toast';
import { CirclePlus } from 'lucide-vue-next';
import logger from '../../services/logging';

const notificationStore = useNotificationStore();
const postStore = usePostStore();
const { newItemsCount } = storeToRefs(notificationStore);
const { handleError } = useErrorHandler();
const { toast } = useToast();

const NEW_ITEMS_CHECK_INTERVAL = 60000; // 60 seconds
let intervalId;

// Function to check for new items
const checkForNewItems = async () => {
    try {
        const lastPost = postStore.posts?.[0];
        const lastPostId = lastPost ? lastPost.id : null;
        if (lastPostId) {
            await notificationStore.checkNewItems(lastPostId, postStore.categoryId);
            logger.debug(`New items count: ${newItemsCount.value}`);
        } else {
            logger.debug('No posts found. Skipping new items check.');
        }
    } catch (error) {
        handleError(error);
    }
};

// Handle notification click
const handleNotificationClick = async () => {
    try {
        await postStore.fetchPosts();
        notificationStore.resetNewItemsCount();
        toast({ type: 'success', message: 'Posts refreshed with new items.' });
    } catch (error) {
        handleError(error);
    }
};

// Setup interval on mount
onMounted(() => {
    checkForNewItems();
    intervalId = setInterval(checkForNewItems, NEW_ITEMS_CHECK_INTERVAL);
});

// Cleanup interval on unmount
onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
});
</script>