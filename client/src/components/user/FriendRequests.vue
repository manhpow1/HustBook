<template>
    <div class="container mx-auto px-4 py-8">
        <h2 class="text-2xl font-bold mb-4">Friend Requests</h2>
        <p v-if="isLoading">Loading friend requests...</p>
        <p v-if="error" class="text-red-500">{{ error }}</p>
        <p v-if="!isLoading && !error && friendRequests.length === 0">
            No friend requests at the moment.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card v-for="request in friendRequests" :key="request.id">
                <div class="flex items-center mb-4">
                    <img v-if="request.avatar" :src="request.avatar" :alt="request.username"
                        class="w-12 h-12 rounded-full mr-4" />
                    <UserIcon v-else class="w-12 h-12 text-gray-400 mr-4" />
                    <div>
                        <h3 class="font-semibold">{{ request.username }}</h3>
                        <p class="text-sm text-gray-500">{{ request.same_friends }} mutual friends</p>
                    </div>
                </div>
                <div class="flex justify-between">
                    <Button variant="primary" @click="acceptFriendRequest(request.id)">
                        Accept
                    </Button>
                    <Button variant="outline" @click="rejectFriendRequest(request.id)">
                        Reject
                    </Button>
                </div>
            </Card>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../stores/userStore'
import { useFriendStore } from '../../stores/friendStore'
import {Button, Card } from '../ui'
import { UserIcon } from 'lucide-vue-next'

const userStore = useUserStore()
const friendStore = useFriendStore()
const friendRequests = ref([])
const isLoading = ref(false)
const error = ref(null)

const fetchFriendRequests = async () => {
    isLoading.value = true
    error.value = null
    try {
        const response = await friendStore.getRequestedFriends()
        friendRequests.value = response.request
    } catch (err) {
        error.value = 'Failed to load friend requests'
        console.error('Error fetching friend requests:', err)
    } finally {
        isLoading.value = false
    }
}

const acceptFriendRequest = async (userId) => {
    try {
        await friendStore.acceptFriendRequest(userId)
        // Remove the accepted request from the list
        friendRequests.value = friendRequests.value.filter(request => request.id !== userId)
    } catch (err) {
        console.error('Error accepting friend request:', err)
        // You might want to show an error message to the user here
    }
}

const rejectFriendRequest = async (userId) => {
    try {
        await friendStore.rejectFriendRequest(userId)
        // Remove the rejected request from the list
        friendRequests.value = friendRequests.value.filter(request => request.id !== userId)
    } catch (err) {
        console.error('Error rejecting friend request:', err)
        // You might want to show an error message to the user here
    }
}

onMounted(() => {
    if (userStore.isLoggedIn) {
        fetchFriendRequests()
    }
})
</script>