<template>
    <div v-if="newItemsCount > 0"
        class="fixed top-4 right-4 bg-blue-500 text-white p-2 rounded-md cursor-pointer shadow-lg"
        @click="handleNotificationClick">
        {{ newItemsCount }} new item{{ newItemsCount !== 1 ? 's' : '' }} available. Click to refresh.
    </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '../../stores/notificationStore';
import { usePostStore } from '../../stores/postStore';
import { storeToRefs } from 'pinia'

const notificationStore = useNotificationStore()
const postStore = usePostStore()
const { newItemsCount } = storeToRefs(notificationStore)

const checkInterval = 60000 // Check every minute
let intervalId

const checkForNewItems = () => {
    const lastPostId = postStore.posts[0]?.id // Assuming posts are sorted with newest first
    if (lastPostId) {
        notificationStore.checkNewItems(lastPostId)
    }
}

const handleNotificationClick = () => {
    postStore.fetchPosts() // This should be modified to fetch only new posts
    notificationStore.resetNewItemsCount()
}

onMounted(() => {
    checkForNewItems() // Check immediately on mount
    intervalId = setInterval(checkForNewItems, checkInterval)
})

onUnmounted(() => {
    clearInterval(intervalId)
})
</script>