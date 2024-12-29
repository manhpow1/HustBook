<template>
    <div>
        <h2 class="text-xl font-semibold mb-4">Privacy Settings</h2>

        <div>
            <h3 class="text-lg font-medium mb-2">Blocked Accounts</h3>
            <div class="mb-4">
                <input type="text" v-model="searchQuery" @input="searchUsers" placeholder="Search users to block"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ref="searchInput" aria-label="Search users to block">
            </div>

            <div v-if="searchResults.length > 0" class="mb-4">
                <h4 class="text-md font-medium mb-2">Search Results</h4>
                <ul class="space-y-2">
                    <li v-for="user in searchResults" :key="user.id" class="flex items-center justify-between">
                        <span>{{ user.name }}</span>
                        <button @click="blockUser(user.id)"
                            class="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 transition duration-300"
                            aria-label="Block User">
                            Block
                        </button>
                    </li>
                </ul>
            </div>

            <h4 class="text-md font-medium mb-2">Currently Blocked</h4>
            <ul class="space-y-2">
                <li v-for="user in blockedUsers" :key="user.id" class="flex items-center justify-between">
                    <div class="flex items-center">
                        <img :src="user.avatar || '../../assets/avatar-default.svg'" :alt="user.name"
                            class="w-8 h-8 bg-gray-300 rounded-full mr-2" />
                        <span>{{ user.name }}</span>
                    </div>
                    <button @click="unblockUser(user.id)"
                        class="text-blue-500 hover:underline bg-transparent border border-blue-500 rounded px-2 py-1 transition duration-300"
                        aria-label="Unblock User">
                        Unblock
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFriendStore } from '../../stores/friendStore';
import { useToast } from '../ui/toast';

const friendStore = useFriendStore();
const toast = useToast();

const searchQuery = ref('');
const searchResults = ref([]);
const blockedUsers = ref([]);
const searchInput = ref(null);

// Load blocked users on component mount
onMounted(() => {
    searchInput.value.focus();
    loadBlockedUsers();
});

const loadBlockedUsers = async () => {
    try {
        // Assuming getListBlocks fetches and populates blockedUsers in the store
        await friendStore.getListBlocks();
        blockedUsers.value = friendStore.blockedUsers;
    } catch (error) {
        toast('Failed to load blocked users', 'error');
    }
};

const searchUsers = async () => {
    if (searchQuery.value.length < 3) {
        searchResults.value = [];
        return;
    }

    try {
        // Assuming there's a searchUsers method in the friendStore or a separate settingsStore
        searchResults.value = await friendStore.searchUsers(searchQuery.value);
    } catch (error) {
        toast('Failed to search users', 'error');
    }
};

const blockUser = async (userId) => {
    try {
        await friendStore.setBlock(userId, 0); // type: 0 to block
        toast('User blocked successfully', 'success');
        loadBlockedUsers(); // Refresh the blocked users list
        searchResults.value = searchResults.value.filter(user => user.id !== userId); // Remove from search results
    } catch (error) {
        toast('Failed to block user', 'error');
    }
};

const unblockUser = async (userId) => {
    try {
        await friendStore.setBlock(userId, 1); // type: 1 to unblock
        toast('User unblocked successfully', 'success');
        blockedUsers.value = blockedUsers.value.filter(user => user.id !== userId); // Remove from blocked list
    } catch (error) {
        toast('Failed to unblock user', 'error');
    }
};
</script>