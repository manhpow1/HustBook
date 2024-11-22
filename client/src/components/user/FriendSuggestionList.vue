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
            <li v-for="suggestion in friendSuggestions" :key="suggestion.id" class="bg-white shadow rounded-lg p-4">
                <div class="flex items-center mb-4">
                    <img :src="suggestion.avatar || '/default-avatar.png'" :alt="suggestion.username"
                        class="w-12 h-12 rounded-full mr-4">
                    <div>
                        <h3 class="font-semibold">{{ suggestion.username }}</h3>
                        <p class="text-sm text-gray-500">{{ suggestion.mutualFriends }} mutual friends</p>
                    </div>
                </div>
                <button @click="sendFriendRequest(suggestion.id)"
                    class="w-full bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                    :disabled="isProcessing(suggestion.id)">
                    {{ isProcessing(suggestion.id) ? 'Sending...' : 'Add Friend' }}
                </button>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFriendStore } from '../../stores/friendStore';
import { useToast } from '../../composables/useToast';
import FriendSuggestionSkeleton from './FriendSuggestionSkeleton.vue';

const friendStore = useFriendStore();
const { showToast } = useToast();

const friendSuggestions = ref([]);
const loading = ref(true);
const error = ref(null);
const processingSuggestions = ref(new Set());

const fetchFriendSuggestions = async () => {
    try {
        loading.value = true;
        const response = await friendStore.getFriendSuggestions();
        friendSuggestions.value = response.suggestions;
    } catch (err) {
        error.value = 'Failed to load friend suggestions';
    } finally {
        loading.value = false;
    }
};

const isProcessing = (suggestionId) => processingSuggestions.value.has(suggestionId);

const sendFriendRequest = async (userId) => {
    if (isProcessing(userId)) return;

    processingSuggestions.value.add(userId);
    try {
        await friendStore.sendFriendRequest(userId);
        friendSuggestions.value = friendSuggestions.value.filter(suggestion => suggestion.id !== userId);
        showToast('Friend request sent', 'success');
    } catch (err) {
        console.error('Error sending friend request:', err);
        showToast('Failed to send friend request', 'error');
    } finally {
        processingSuggestions.value.delete(userId);
    }
};

onMounted(fetchFriendSuggestions);
</script>