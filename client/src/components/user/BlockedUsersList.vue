<template>
    <div class="blocked-users-list">
        <h2 class="text-2xl font-bold mb-4">Blocked Users</h2>

        <!-- Loading Indicator -->
        <div v-if="loading" class="text-center py-4" role="status" aria-live="polite">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" aria-hidden="true"></div>
        </div>

        <!-- Error Message -->
        <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert">
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline">{{ error }}</span>
        </div>

        <!-- Blocked Users List -->
        <ul v-else-if="blockedUsers.length > 0" class="space-y-4">
            <li v-for="user in blockedUsers" :key="user.id"
                class="flex items-center justify-between bg-white p-4 rounded-lg shadow">
                <div class="flex items-center">
                    <img :src="user.avatar || '../../assets/avatar-default.svg'" :alt="user.name"
                        class="w-10 h-10 rounded-full mr-4" />
                    <span class="font-medium">{{ user.name }}</span>
                </div>
                <button @click="unblockUser(user.id)"
                    class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300"
                    aria-label="Unblock User">
                    Unblock
                </button>
            </li>
        </ul>

        <!-- No Blocked Users Message -->
        <p v-else class="text-gray-500 text-center py-4">You haven't blocked any users.</p>

        <!-- Load More Button -->
        <div v-if="hasMore" class="text-center mt-4">
            <button @click="loadMore"
                class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition duration-300"
                :disabled="isLoading" :aria-disabled="isLoading">
                Load More
            </button>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useFriendStore } from '../../stores/friendStore';
import { storeToRefs } from 'pinia';

const friendStore = useFriendStore();
const { blockedUsers, loading, error, hasMore, isLoading } = storeToRefs(friendStore);

// Load initial blocked users on component mount
onMounted(() => {
    friendStore.getListBlocks();
});

// Load more blocked users
const loadMore = () => {
    friendStore.getListBlocks();
};

// Unblock a specific user
const unblockUser = async (userId) => {
    try {
        await friendStore.unblockUser(userId);
    } catch (err) {
        // Error handling is managed via the store's reactive properties
        console.error(`Error unblocking user with ID ${userId}:`, err);
    }
};
</script>