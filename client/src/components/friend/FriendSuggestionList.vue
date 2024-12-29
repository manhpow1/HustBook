<template>
    <div>
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FriendSuggestionSkeleton v-for="i in 3" :key="i" />
        </div>
        <div v-else-if="error" class="text-red-500 py-4">
            {{ error }}
        </div>
        <div v-else-if="friendSuggestions.length === 0" class="text-gray-500 py-4">
            No friend suggestions at the moment.
        </div>
        <ul v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <li v-for="suggestion in friendSuggestions" :key="suggestion.userId" class="bg-white shadow rounded-lg p-4">
                <div class="flex items-center mb-4">
                    <img :src="suggestion.avatar || defaultAvatar" :alt="suggestion.userName"
                        class="w-12 h-12 rounded-full mr-4">
                    <div>
                        <h3 class="font-semibold">{{ suggestion.userName }}</h3>
                        <p class="text-sm text-gray-500">{{ suggestion.same_friends }} mutual friends</p>
                    </div>
                </div>
                <div class="flex justify-between">
                    <button @click="sendFriendRequest(suggestion.userId)"
                        class="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                        :disabled="isProcessing(suggestion.userId)" aria-label="Add Friend">
                        {{ isProcessing(suggestion.userId) ? 'Sending...' : 'Add Friend' }}
                    </button>
                    <button @click="confirmBlock(suggestion.userId)"
                        class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-300"
                        :disabled="isProcessing(suggestion.userId)" aria-label="Block User">
                        {{ isProcessing(suggestion.userId) ? 'Processing...' : 'Block' }}
                    </button>
                </div>
            </li>
        </ul>

        <!-- Confirm Dialog for Blocking -->
        <ConfirmDialog v-model="confirmDialog" :title="'Block User'"
            :message="'Are you sure you want to block this user? You won\'t receive any messages or friend requests from them.'"
            :confirmText="'Block'" :cancelText="'Cancel'" :isLoading="isLoading" :loadingText="'Blocking...'"
            @confirm="blockConfirmed" @cancel="cancelBlock" />
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFriendStore } from '../../stores/friendStore';
import { useToast } from '../ui/toast';
import FriendSuggestionSkeleton from './FriendSuggestionSkeleton.vue';
import ConfirmDialog from '../ui/ConfirmDialog.vue';
import defaultAvatar from '../../assets/avatar-default.svg';

const friendStore = useFriendStore();
const { showToast } = useToast();

const friendSuggestions = ref([]);
const loading = ref(true);
const error = ref(null);
const processingSuggestions = ref(new Set());
const confirmDialog = ref(false);
const userToBlock = ref(null);
const isLoading = ref(false);

const sendFriendRequest = async (userId) => {
    if (processingSuggestions.value.has(userId)) return;

    processingSuggestions.value.add(userId);
    try {
        await friendStore.sendFriendRequest(userId);
        showToast('Friend request sent', 'success');
        // Optionally remove the user from suggestions after sending request
        friendSuggestions.value = friendSuggestions.value.filter(user => user.userId !== userId);
    } catch (err) {
        console.error(`Error sending friend request to user ID ${userId}:`, err);
        showToast('Failed to send friend request', 'error');
    } finally {
        processingSuggestions.value.delete(userId);
    }
};

const confirmBlock = (userId) => {
    userToBlock.value = userId;
    confirmDialog.value = true;
};

const blockConfirmed = async () => {
    if (!userToBlock.value) return;
    isLoading.value = true;

    try {
        await friendStore.setBlock(userToBlock.value, 0); // type: 0 to block
        showToast('User blocked successfully', 'success');
        // Remove the blocked user from suggestions
        friendSuggestions.value = friendSuggestions.value.filter(user => user.userId !== userToBlock.value);
    } catch (err) {
        console.error(`Error blocking user with ID ${userToBlock.value}:`, err);
        showToast('Failed to block user', 'error');
    } finally {
        isLoading.value = false;
        confirmDialog.value = false;
        userToBlock.value = null;
    }
};

const cancelBlock = () => {
    confirmDialog.value = false;
    userToBlock.value = null;
};

// Load suggested friends on mount
onMounted(async () => {
    try {
        loading.value = true;
        await friendStore.getListSuggestedFriends();
        friendSuggestions.value = friendStore.suggestedFriends;
    } catch (err) {
        error.value = 'Failed to load suggested friends';
    } finally {
        loading.value = false;
    }
});
</script>