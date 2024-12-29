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
                    <span class="font-medium">{{ user.userName }}</span>
                </div>
                <button @click="confirmUnblock(user.id)"
                    class="text-blue-500 hover:underline bg-transparent border border-blue-500 rounded px-2 py-1 transition duration-300"
                    aria-label="Unblock User">
                    Unblock
                </button>
            </li>
        </ul>

        <!-- No Blocked Users Message -->
        <p v-else class="text-gray-500 text-center py-4">You haven't blocked any users.</p>

        <!-- Load More Button -->
        <div v-if="hasMoreBlockedUsers" class="text-center mt-4">
            <button @click="loadMore"
                class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition duration-300"
                :disabled="loading" :aria-disabled="loading">
                Load More
            </button>
        </div>

        <!-- Confirm Dialog for Unblocking -->
        <ConfirmDialog v-model="confirmDialog" :title="'Unblock User'"
            :message="'Are you sure you want to unblock this user? They will be able to send you messages and friend requests again.'"
            confirmText="Unblock" cancelText="Cancel" :isLoading="isProcessing" loadingText="Processing..."
            @confirm="unblockConfirmed" @cancel="cancelUnblock" />
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { usefriendStore } from '../../stores/friendStore';
import { useToast } from '../ui/toast';
import ConfirmDialog from '../shared/ConfirmDialog.vue';

const friendStore = usefriendStore();
const { toast } = useToast();

const blockedUsers = ref([]);
const loading = ref(true);
const error = ref(null);

// Confirmation Dialog State
const confirmDialog = ref(false);
const dialogTitle = ref('');
const dialogMessage = ref('');
const userIdToUnblock = ref('');
const isProcessing = ref(false);

onMounted(async () => {
    await loadBlockedUsers();
});

const loadBlockedUsers = async () => {
    try {
        loading.value = true;
        await friendStore.getBlockedUsers();
        blockedUsers.value = friendStore.blockedUsers;
    } catch (err) {
        toast({ type: 'error', message: 'Failed to load blocked users' });
    } finally {
        loading.value = false;
    }
};

const confirmUnblock = (userId) => {
    userIdToUnblock.value = userId;
    dialogTitle.value = 'Unblock User';
    dialogMessage.value = 'Are you sure you want to unblock this user? They will be able to send you messages and friend requests again.';
    confirmDialog.value = true;
};

const unblockConfirmed = async () => {
    if (!userIdToUnblock.value) return;

    isProcessing.value = true;

    try {
        await friendStore.unblockUser(userIdToUnblock.value);
        toast({ type: 'success', message: 'User unblocked successfully' });
        blockedUsers.value = blockedUsers.value.filter(user => user.id !== userIdToUnblock.value);
    } catch (err) {
        console.error(`Error unblocking user with ID ${userIdToUnblock.value}:`, err);
        toast({ type: 'error', message: 'Failed to unblock user' });
    } finally {
        isProcessing.value = false;
        confirmDialog.value = false;
        userIdToUnblock.value = '';
    }
};

const cancelUnblock = () => {
    confirmDialog.value = false;
    userIdToUnblock.value = '';
};

const loadMore = async () => {
    try {
        await friendStore.getListBlocks();
        blockedUsers.value = friendStore.blockedUsers;
    } catch (err) {
        toast({ type: 'error', message: 'Failed to load more blocked users' });
    }
};
</script>