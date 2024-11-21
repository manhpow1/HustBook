import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiService from '../services/api'

export const useFriendStore = defineStore('friend', () => {
    const friends = ref([])
    const friendRequests = ref([])
    const loading = ref(false)
    const error = ref(null)
    const total = ref(0)

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

    const getUserFriends = async (params = {}) => {
        loading.value = true
        error.value = null

        try {
            const response = await apiService.getUserFriends({
                user_id: params.userId,
                index: params.index || 0,
                count: params.count || 20
            })

            if (response.data.code === '1000') {
                friends.value = response.data.data.friends
                total.value = parseInt(response.data.data.total)
            } else {
                throw new Error(response.data.message || 'Failed to load friends')
            }
        } catch (err) {
            error.value = 'Failed to load friends'
            await handleError(err)
        } finally {
            loading.value = false
        }
    }

    const resetFriends = () => {
        friends.value = []
        total.value = 0
        error.value = null
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
        friends,
        total,
        getUserFriends,
        resetFriends,
        getRequestedFriends,
        acceptFriendRequest,
        rejectFriendRequest,
    }
})