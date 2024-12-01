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
            <li v-for="suggestion in friendSuggestions" :key="suggestion.user_id"
                class="bg-white shadow rounded-lg p-4">
                <div class="flex items-center mb-4">
                    <img :src="suggestion.avatar || '../../assets/avatar-default.svg'" :alt="suggestion.username"
                        class="w-12 h-12 rounded-full mr-4">
                    <div>
                        <h3 class="font-semibold">{{ suggestion.username }}</h3>
                        <p class="text-sm text-gray-500">{{ suggestion.same_friends }} mutual friends</p>
                    </div>
                </div>
                <button @click="sendFriendRequest(suggestion.user_id)"
                    class="w-full bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                    :disabled="isProcessing(suggestion.user_id)">
                    {{ isProcessing(suggestion.user_id) ? 'Sending...' : 'Add Friend' }}
                </button>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useFriendStore } from '../../stores/friendStore';
import { useToast } from '../../composables/useToast';
import FriendSuggestionSkeleton from './FriendSuggestionSkeleton.vue';

const friendStore = useFriendStore();
const { showToast } = useToast();

const { friendSuggestions, loading, error } = storeToRefs(friendStore);
const processingSuggestions = ref(new Set());

const isProcessing = (suggestionId) => processingSuggestions.value.has(suggestionId);

const sendFriendRequest = async (userId) => {
    if (isProcessing(userId)) return;

    processingSuggestions.value.add(userId);
    try {
        await friendStore.sendFriendRequest(userId);
        friendStore.removeSuggestion(userId);
        showToast('Friend request sent', 'success');
    } catch (err) {
        console.error('Error sending friend request:', err);
        showToast('Failed to send friend request', 'error');
    } finally {
        processingSuggestions.value.delete(userId);
    }
};

onMounted(() => friendStore.getListSuggestedFriends());
</script>