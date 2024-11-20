import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiService from '../services/api'

export const useFriendStore = defineStore('friend', () => {
    const friendRequests = ref([])
    const loading = ref(false)
    const error = ref(null)

    const getRequestedFriends = async (index = 0, count = 20) => {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.getRequestedFriends({ index, count })
            if (response.data.code === '1000') {
                friendRequests.value = response.data.data.request
                return response.data.data
            } else {
                throw new Error(response.data.message || 'Failed to get friend requests')
            }
        } catch (err) {
            console.error('Error fetching friend requests:', err)
            error.value = err.message
        } finally {
            loading.value = false
        }
    }

    const acceptFriendRequest = async (userId) => {
        // Implement accept friend request logic
    }

    const rejectFriendRequest = async (userId) => {
        // Implement reject friend request logic
    }

    return {
        friendRequests,
        loading,
        error,
        getRequestedFriends,
        acceptFriendRequest,
        rejectFriendRequest,
    }
})