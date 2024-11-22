<template>
    <div>
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FriendRequestSkeleton v-for="i in 3" :key="i" />
        </div>
        <div v-else-if="error" class="text-red-500 py-4">
            {{ error }}
        </div>
        <div v-else-if="friendRequests.length === 0" class="text-gray-500 py-4">
            No friend requests at the moment.
        </div>
        <ul v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <li v-for="request in friendRequests" :key="request.id" class="bg-white shadow rounded-lg p-4">
                <div class="flex items-center mb-4">
                    <img :src="request.avatar || '/default-avatar.png'" :alt="request.username"
                        class="w-12 h-12 rounded-full mr-4">
                    <div>
                        <h3 class="font-semibold">{{ request.username }}</h3>
                        <p class="text-sm text-gray-500">{{ request.same_friends }} mutual friends</p>
                    </div>
                </div>
                <div class="flex justify-between">
                    <button @click="acceptRequest(request.id)"
                        class="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                        :disabled="isProcessing(request.id)">
                        {{ isProcessing(request.id) ? 'Processing...' : 'Accept' }}
                    </button>
                    <button @click="rejectRequest(request.id)"
                        class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                        :disabled="isProcessing(request.id)">
                        {{ isProcessing(request.id) ? 'Processing...' : 'Reject' }}
                    </button>
                </div>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFriendStore } from '../../stores/friendStore';
import { useToast } from '../../composables/useToast';

const friendStore = useFriendStore();
const { showToast } = useToast();

const processingRequests = ref(new Set());

const isProcessing = (requestId) => processingRequests.value.has(requestId);

const acceptRequest = async (userId) => {
    if (isProcessing(userId)) return;

    processingRequests.value.add(userId);
    try {
        const success = await friendStore.setAcceptFriend(userId, '1');
        if (success) {
            showToast('Friend request accepted', 'success');
        } else {
            showToast('Failed to accept friend request', 'error');
        }
    } finally {
        processingRequests.value.delete(userId);
    }
};

const rejectRequest = async (userId) => {
    if (isProcessing(userId)) return;

    processingRequests.value.add(userId);
    try {
        const success = await friendStore.setAcceptFriend(userId, '0');
        if (success) {
            showToast('Friend request rejected', 'success');
        } else {
            showToast('Failed to reject friend request', 'error');
        }
    } finally {
        processingRequests.value.delete(userId);
    }
};

onMounted(() => {
    friendStore.getRequestedFriends();
});
</script>