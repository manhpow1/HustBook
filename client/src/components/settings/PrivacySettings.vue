<template>
    <div>
        <h2 class="text-xl font-semibold mb-4">Privacy Settings</h2>

        <div>
            <h3 class="text-lg font-medium mb-2">Blocked Accounts</h3>
            <div class="mb-4">
                <input type="text" v-model="searchQuery" @input="searchUsers" placeholder="Search users to block"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ref="searchInput">
            </div>

            <div v-if="searchResults.length > 0" class="mb-4">
                <h4 class="text-md font-medium mb-2">Search Results</h4>
                <ul class="space-y-2">
                    <li v-for="user in searchResults" :key="user.id" class="flex items-center justify-between">
                        <span>{{ user.name }}</span>
                        <button @click="blockUser(user.id)"
                            class="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 transition duration-300">
                            Block
                        </button>
                    </li>
                </ul>
            </div>

            <h4 class="text-md font-medium mb-2">Currently Blocked</h4>
            <ul class="space-y-2">
                <li v-for="user in blockedUsers" :key="user.id" class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-gray-300 rounded-full mr-2"></div>
                        <span>{{ user.name }}</span>
                    </div>
                    <button @click="unblockUser(user.id)" class="text-blue-500 hover:underline">
                        Unblock
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore';
import { useToast } from '@/composables/useToast';

const settingsStore = useSettingsStore();
const { showToast } = useToast();

const searchQuery = ref('');
const searchResults = ref([]);
const blockedUsers = ref([]);
const searchInput = ref(null);

onMounted(() => {
    searchInput.value.focus();
    loadBlockedUsers();
});

const loadBlockedUsers = async () => {
    try {
        blockedUsers.value = await settingsStore.getBlockedUsers();
    } catch (error) {
        showToast('Failed to load blocked users', 'error');
    }
};

const searchUsers = async () => {
    if (searchQuery.value.length < 3) {
        searchResults.value = [];
        return;
    }

    try {
        searchResults.value = await settingsStore.searchUsers(searchQuery.value);
    } catch (error) {
        showToast('Failed to search users', 'error');
    }
};

const blockUser = async (userId) => {
    try {
        await settingsStore.blockUser(userId);
        showToast('User blocked successfully', 'success');
        loadBlockedUsers();
        searchResults.value = searchResults.value.filter(user => user.id !== userId);
    } catch (error) {
        showToast('Failed to block user', 'error');
    }
};

const unblockUser = async (userId) => {
    try {
        await settingsStore.unblockUser(userId);
        showToast('User unblocked successfully', 'success');
        blockedUsers.value = blockedUsers.value.filter(user => user.id !== userId);
    } catch (error) {
        showToast('Failed to unblock user', 'error');
    }
};
</script>