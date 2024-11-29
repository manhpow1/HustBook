import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiService from '../services/api'
import { handleError } from '../utils/errorHandler'
import router from '../router'

export const useFriendStore = defineStore('friend', () => {
    const friends = ref([])
    const friendRequests = ref([])
    const suggestedFriends = ref([])
    const loading = ref(false)
    const error = ref(null)
    const total = ref(0)
    const sortBy = ref('name')
    const blockedUsers = ref([])
    const blockedUsersLoading = ref(false)
    const blockedUsersError = ref(null)
    const hasMoreBlockedUsers = ref(true)
    const blockedUsersIndex = ref(0)
    const blockedUsersCount = ref(20)

    const getRequestedFriends = async (index = 0, count = 20) => {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.getRequestedFriends({ index, count })
            const data = response.data

            if (data.code === '1000') {
                friendRequests.value = data.data.request
                total.value = parseInt(data.data.total)
            } else if (data.code === '9994') {
                friendRequests.value = []
                total.value = 0
            } else {
                throw new Error(data.message || 'Failed to get friend requests')
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
            const data = response.data

            if (data.code === '1000') {
                friends.value = data.data.friends
                total.value = parseInt(data.data.total)
            } else if (data.code === '9994') {
                friends.value = []
                total.value = 0
            } else {
                throw new Error(data.message || 'Failed to load friends')
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

    const setAcceptFriend = async (userId, isAccept) => {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.setAcceptFriend(userId, isAccept)
            const data = response.data

            if (data.code === '1000') {
                friendRequests.value = friendRequests.value.filter(request => request.id !== userId)
                if (isAccept === '1') {
                    // Optionally update friends list
                }
                return true
            } else {
                throw new Error(data.message || 'Failed to process friend request')
            }
        } catch (err) {
            error.value = 'Failed to process friend request'
            await handleError(err, router)
            return false
        } finally {
            loading.value = false
        }
    }

    const getListSuggestedFriends = async (index = 0, count = 20) => {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.getListSuggestedFriends(index, count)
            const data = response.data

            if (data.code === '1000') {
                suggestedFriends.value = data.data.list_users
            } else if (data.code === '9994') {
                suggestedFriends.value = []
            } else {
                throw new Error(data.message || 'Failed to get suggested friends')
            }
        } catch (err) {
            error.value = 'Failed to load suggested friends'
            await handleError(err, router)
        } finally {
            loading.value = false
        }
    }

    const sendFriendRequest = async (userId) => {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.sendFriendRequest(userId)
            const data = response.data

            if (data.code === '1000') {
                // Optionally update UI or state
                return data.data
            } else {
                throw new Error(data.message || 'Failed to send friend request')
            }
        } catch (err) {
            error.value = 'Failed to send friend request'
            await handleError(err, router)
        } finally {
            loading.value = false
        }
    }

    const getListBlocks = async (index = 0, count = 20) => {
        if (!hasMoreBlockedUsers.value) return

        blockedUsersLoading.value = true
        blockedUsersError.value = null

        try {
            const response = await apiService.getListBlocks({ index, count })
            const data = response.data

            if (data.code === '1000') {
                blockedUsers.value = [...blockedUsers.value, ...data.data.data]
                blockedUsersIndex.value += data.data.data.length
                hasMoreBlockedUsers.value = data.data.data.length === count
            } else if (data.code === '9994') {
                hasMoreBlockedUsers.value = false
            } else {
                throw new Error(data.message || 'Failed to fetch blocked users')
            }
        } catch (err) {
            blockedUsersError.value = 'Failed to load blocked users'
            await handleError(err, router)
        } finally {
            blockedUsersLoading.value = false
        }
    }

    const unblockUser = async (userId) => {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.unblockUser(userId)
            const data = response.data

            if (data.code === '1000') {
                blockedUsers.value = blockedUsers.value.filter(user => user.id !== userId)
            } else {
                throw new Error(data.message || 'Failed to unblock user')
            }
        } catch (err) {
            error.value = 'Failed to unblock user'
            await handleError(err, router)
        } finally {
            loading.value = false
        }
    }

    const resetBlockedUsers = () => {
        blockedUsers.value = []
        blockedUsersIndex.value = 0
        hasMoreBlockedUsers.value = true
        blockedUsersError.value = null
    }

    const setSortBy = (sort) => {
        sortBy.value = sort
    }

    return {
        friends,
        friendRequests,
        suggestedFriends,
        loading,
        error,
        sortedFriends,
        total,
        blockedUsers,
        blockedUsersLoading,
        blockedUsersError,
        hasMoreBlockedUsers,
        getUserFriends,
        resetFriends,
        getRequestedFriends,
        setAcceptFriend,
        setSortBy,
        getListSuggestedFriends,
        sendFriendRequest,
        getListBlocks,
        unblockUser,
        resetBlockedUsers,
    }
})