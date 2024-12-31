<template>
    <Transition enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform -translate-y-2 opacity-0" enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in" leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-2 opacity-0">
        <Alert v-if="newItemsCount > 0" class="fixed top-4 right-4 w-auto max-w-[400px] cursor-pointer shadow-lg"
            variant="default" @click="handleNotificationClick" role="alert">
            <CirclePlusIcon class="h-4 w-4" />
            <AlertTitle class="ml-2">New Items Available</AlertTitle>
            <AlertDescription class="ml-2">
                {{ newItemsCount }} new item{{ newItemsCount !== 1 ? 's' : '' }} available.
                Click to refresh.
            </AlertDescription>
        </Alert>
    </Transition>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { CirclePlusIcon } from 'lucide-vue-next';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePostStore } from '@/stores/postStore';
import { useToast } from '@/components/ui/toast';
import logger from '@/services/logging';

const NEW_ITEMS_CHECK_INTERVAL = 60000; // 1 minute

const notificationStore = useNotificationStore();
const postStore = usePostStore();
const { newItemsCount } = storeToRefs(notificationStore);
const { toast } = useToast();

let intervalId;

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
        toast({
            title: "Error",
            description: "Failed to check for new items",
            variant: "destructive",
        });
        logger.error('Error checking for new items:', error);
    }
};

const handleNotificationClick = async () => {
    try {
        await postStore.fetchPosts();
        notificationStore.resetNewItemsCount();
        toast({
            title: "Success",
            description: "Posts refreshed with new items",
        });
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to refresh posts",
            variant: "destructive",
        });
        logger.error('Error refreshing posts:', error);
    }
};

onMounted(() => {
    checkForNewItems();
    intervalId = setInterval(checkForNewItems, NEW_ITEMS_CHECK_INTERVAL);
});

onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
});
</script>