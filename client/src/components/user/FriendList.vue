<template>
    <div class="friend-list">
        <h2 class="text-xl font-bold mb-4">Friends</h2>
        <ul v-if="friendStore.friends.length > 0" class="space-y-4">
            <li v-for="friend in friendStore.friends" :key="friend.id"
                class="flex items-center space-x-4 p-2 hover:bg-gray-100 rounded-lg transition duration-200">
                <img :src="friend.avatar" :alt="`${friend.username}'s avatar`"
                    class="w-12 h-12 rounded-full object-cover">
                <div>
                    <h3 class="font-semibold">{{ friend.username }}</h3>
                    <p class="text-sm text-gray-600">{{ friend.same_friends }} mutual friends</p>
                    <p class="text-xs text-gray-500">Friends since {{ formatDate(friend.created) }}</p>
                </div>
            </li>
        </ul>
        <div v-else-if="friendStore.loading" class="text-center py-4">
            <p>Loading friends...</p>
        </div>
        <div v-else-if="friendStore.error" class="text-center py-4 text-red-500">
            <p>{{ friendStore.error }}</p>
        </div>
        <div v-else class="text-center py-4 text-gray-500">
            <p>No friends found.</p>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useFriendStore } from '../stores/friendStore'
import { formatDate } from '../../utils/helpers';

const friendStore = useFriendStore()

onMounted(() => {
    friendStore.getUserFriends()
})
</script>