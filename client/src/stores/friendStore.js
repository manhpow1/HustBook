import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiService from '../services/api'
import { useErrorHandler } from '@/utils/errorHandler';
import { useToast } from '@/components/ui/toast';

export const useFriendStore = defineStore('friend', () => {
    const friends = ref([]);
    const friendRequests = ref([]);
    const suggestedFriends = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const total = ref(0);
    const sortBy = ref('name');
    const blockedUsers = ref([]);
    const blockedUsersLoading = ref(false);
    const blockedUsersError = ref(null);
    const hasMoreBlockedUsers = ref(true);
    const blockedUsersIndex = ref(0);
    const blockedUsersCount = ref(20);
    const sentRequests = ref(new Set());
    const { toast } = useToast();
    const { handleError } = useErrorHandler();

    const sortedFriends = computed(() => {
        return [...friends.value].sort((a, b) => {
            if (sortBy.value === 'name') {
                return a.userName.localeCompare(b.userName);
            } else if (sortBy.value === 'recent') {
                return new Date(b.created) - new Date(a.created);
            } else if (sortBy.value === 'mutual') {
                return b.same_friends - a.same_friends;
            }
            return 0;
        });
    });

    const getRequestedFriends = async (index = 0, count = 20) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.getRequestedFriends({ index, count });
            const data = response.data;

            if (data.code === '1000') {
                friendRequests.value = data.data.request;
                total.value = parseInt(data.data.total);
            } else if (data.code === '9994') {
                friendRequests.value = [];
                total.value = 0;
            } else {
                throw new Error(data.message || 'Failed to get friend requests');
            }
        } catch (err) {
            error.value = 'Failed to load friend requests';
            await handleError(err);
        } finally {
            loading.value = false;
        }
    };

    const getUserFriends = async (params = {}) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.getUserFriends({
                userId: params.userId,
                index: params.index || 0,
                count: params.count || 20
            });
            const data = response.data;
            if (data.code === '1000') {
                friends.value = data.data.friends;
                total.value = parseInt(data.data.total);
                return {
                    friends: data.data.friends,
                    total: parseInt(data.data.total)
                };
            } else if (data.code === '9994') {
                friends.value = [];
                total.value = 0;
                return {
                    friends: [],
                    total: 0
                };
            } else {
                throw new Error(data.message || 'Failed to load friends');
            }
        } catch (err) {
            error.value = 'Failed to load friends';
            await handleError(err);
        } finally {
            loading.value = false;
        }
    };

    const resetFriends = () => {
        friends.value = [];
        total.value = 0;
        error.value = null;
    };

    const setAcceptFriend = async (userId, isAccept) => {
        loading.value = true;
        error.value = null;
        try {
            console.debug('friendRequests:', friendRequests.value)
            const response = await apiService.setAcceptFriend(userId, isAccept);
            const data = response.data;

            if (data.code === '1000') {
                friendRequests.value = friendRequests.value.filter(request => request.userId !== userId);
                if (isAccept === '1') {
                    // Optionally update friends list
                }
                return true;
            } else {
                throw new Error(data.message || 'Failed to process friend request');
            }
        } catch (err) {
            error.value = 'Failed to process friend request';
            await handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const getListSuggestedFriends = async (index = 0, count = 20) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.getListSuggestedFriends(index, count);
            const data = response.data;

            if (data.code === '1000') {
                suggestedFriends.value = data.data.list_users;
            } else if (data.code === '9994') {
                suggestedFriends.value = [];
            } else {
                throw new Error(data.message || 'Failed to get suggested friends');
            }
        } catch (err) {
            error.value = 'Failed to load suggested friends';
            await handleError(err);
        } finally {
            loading.value = false;
        }
    };

    const sendFriendRequest = async (userId) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.sendFriendRequest(userId);
            const data = response.data;
            if (data.code === '1000') {
                sentRequests.value.add(userId);
                toast({ type: 'success', message: 'Friend request sent' });
                return data.data;
            } else {
                throw new Error(data.message || 'Failed to send friend request');
            }
        } catch (err) {
            error.value = 'Failed to send friend request';
            await handleError(err);
            throw err; // Re-throw to allow component-level handling
        } finally {
            loading.value = false;
        }
    };

    const getListBlocks = async (index = blockedUsersIndex.value, count = blockedUsersCount.value) => {
        if (!hasMoreBlockedUsers.value) return;
        blockedUsersLoading.value = true;
        blockedUsersError.value = null;
        try {
            const response = await apiService.getListBlocks({ index, count });
            const data = response.data;

            if (data.code === '1000') {
                const formattedBlocks = data.data.data.map(block => ({
                    ...block,
                    userName: block.userName,
                    blockedAt: new Date().toISOString()
                }));
                blockedUsers.value = [...blockedUsers.value, ...formattedBlocks];
                blockedUsersIndex.value += formattedBlocks.length;
                hasMoreBlockedUsers.value = formattedBlocks.length === count;
            } else if (data.code === '9994') {
                hasMoreBlockedUsers.value = false;
            } else {
                throw new Error(data.message || 'Failed to fetch blocked users');
            }
        } catch (err) {
            blockedUsersError.value = 'Failed to load blocked users';
            await handleError(err);
        } finally {
            blockedUsersLoading.value = false;
        }
    };

    const setBlock = async (userId, type) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.setBlock(userId, type);
            const data = response.data;

            if (data.code === '1000') {
                if (type === 0) {
                    // Blocking the user
                    blockedUsers.value.push(data.data.user); // Assuming API returns the blocked user data
                    toast({ type: 'success', message: 'User blocked successfully' });
                } else if (type === 1) {
                    // Unblocking the user
                    blockedUsers.value = blockedUsers.value.filter(user => user.userId !== userId);
                    toast({ type: 'success', message: 'User unblocked successfully' });
                }
            } else {
                throw new Error(data.message || (type === 0 ? 'Failed to block user' : 'Failed to unblock user'));
            }
        } catch (err) {
            const action = type === 0 ? 'block' : 'unblock';
            error.value = `Failed to ${action} user`;
            await handleError(err);
        } finally {
            loading.value = false;
        }
    };

    const resetBlockedUsers = () => {
        blockedUsers.value = [];
        blockedUsersIndex.value = 0;
        hasMoreBlockedUsers.value = true;
        blockedUsersError.value = null;
    };

    const setSortBy = (sort) => {
        sortBy.value = sort;
    };

    const isFriend = (userId) => {
        if (!userId || !friends.value) return false;
        return friends.value.some(friend => friend.userId === userId);
    };

    return {
        friends,
        friendRequests,
        suggestedFriends,
        loading,
        error,
        sortedFriends,
        sentRequests,
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
        setBlock,
        resetBlockedUsers,
        isFriend,
    }
})
