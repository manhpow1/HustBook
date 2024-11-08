<template>
    <div v-if="newItemsCount > 0"
        class="fixed top-4 right-4 bg-blue-500 text-white p-2 rounded-md cursor-pointer shadow-lg transition-transform duration-300"
        @click="handleNotificationClick" tabindex="0" aria-live="polite" role="alert">
        {{ newItemsCount }} new item{{ newItemsCount !== 1 ? 's' : '' }} available. Click to refresh.
    </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useNotificationStore } from '../../stores/notificationStore';
import { usePostStore } from '../../stores/postStore';
import { storeToRefs } from 'pinia';

const notificationStore = useNotificationStore();
const postStore = usePostStore();
const { newItemsCount } = storeToRefs(notificationStore);

const NEW_ITEMS_CHECK_INTERVAL = 60000;
let intervalId;

const checkForNewItems = () => {
    console.log('Checking for new items...');
    const lastPostId = postStore.posts?.[0]?.id; // Added optional chaining to postStore.posts
    if (lastPostId) {
        console.log(`Last post ID: ${lastPostId}`);
        notificationStore.checkNewItems(lastPostId, postStore.categoryId)
            .then(() => {
                console.log(`New items count updated: ${newItemsCount.value}`);
            })
            .catch(error => {
                console.error('Error fetching new items:', error);
            });
    } else {
        console.log('No posts found. Skipping new items check.');
    }
};

const handleNotificationClick = async () => {
    console.log('Notification clicked. Fetching new posts...');
    await postStore.fetchPosts();
    notificationStore.resetNewItemsCount();
    console.log('New items count reset after fetching posts.');
};

onMounted(() => {
    console.log('Mounted NewItemsNotification.vue');
    checkForNewItems();
    intervalId = setInterval(checkForNewItems, NEW_ITEMS_CHECK_INTERVAL);
});

onUnmounted(() => {
    console.log('Unmounting NewItemsNotification.vue, clearing interval.');
    if (intervalId) clearInterval(intervalId);
});
</script>