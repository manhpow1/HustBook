import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiService from '../services/api'
import router from '../router'

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
            error.value = 'Failed to load friend requests'
            await handleError(err, router)
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
            await handleError(err, router)
        } finally {
            loading.value = false
        }
    }

    const resetFriends = () => {
        friends.value = []
        total.value = 0
        error.value = null
    }

    const sortedFriends = computed(() => {
        return [...friends.value].sort((a, b) => {
            if (sortBy.value === 'name') {
                return a.username.localeCompare(b.username)
            } else if (sortBy.value === 'recent') {
                return new Date(b.created) - new Date(a.created)
            } else if (sortBy.value === 'mutual') {
                return b.same_friends - a.same_friends
            }
            return 0
        })
    })

    const getFriendSuggestions = async () => {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.getFriendSuggestions()
            if (response.data.code === '1000') {
                friendSuggestions.value = response.data.data.suggestions
            } else {
                throw new Error(response.data.message || 'Failed to load friend suggestions')
            }
        } catch (err) {
            error.value = 'Failed to load friend suggestions'
            await handleError(err)
        } finally {
            loading.value = false
        }
    }

    const acceptFriendRequest = async (userId) => {
        try {
            const response = await apiService.acceptFriendRequest(userId)
            if (response.data.code === '1000') {
                friendRequests.value = friendRequests.value.filter(request => request.id !== userId)
                await getUserFriends()
            } else {
                throw new Error(response.data.message || 'Failed to accept friend request')
            }
        } catch (err) {
            await handleError(err)
        }
    }

    const rejectFriendRequest = async (userId) => {
        try {
            const response = await apiService.rejectFriendRequest(userId)
            if (response.data.code === '1000') {
                friendRequests.value = friendRequests.value.filter(request => request.id !== userId)
            } else {
                throw new Error(response.data.message || 'Failed to reject friend request')
            }
        } catch (err) {
            await handleError(err)
        }
    }

    const removeFriend = async (userId) => {
        try {
            const response = await apiService.removeFriend(userId)
            if (response.data.code === '1000') {
                friends.value = friends.value.filter(friend => friend.id !== userId)
            } else {
                throw new Error(response.data.message || 'Failed to remove friend')
            }
        } catch (err) {
            await handleError(err)
        }
    }

    const blockUser = async (userId) => {
        try {
            const response = await apiService.blockUser(userId)
            if (response.data.code === '1000') {
                friends.value = friends.value.filter(friend => friend.id !== userId)
                friendRequests.value = friendRequests.value.filter(request => request.id !== userId)
                friendSuggestions.value = friendSuggestions.value.filter(suggestion => suggestion.id !== userId)
            } else {
                throw new Error(response.data.message || 'Failed to block user')
            }
        } catch (err) {
            await handleError(err)
        }
    }

    const setSortBy = (sort) => {
        sortBy.value = sort
    }

    return {
        friends,
        friendRequests,
        friendSuggestions,
        loading,
        error,
        sortedFriends,        
        total,             
        getUserFriends,
        resetFriends,
        getRequestedFriends,
        acceptFriendRequest,
        rejectFriendRequest,
        setSortBy,
        removeFriend,
        blockUser,        
        getFriendSuggestions,
    }
})