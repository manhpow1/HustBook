import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiService from '../services/api';
import { useErrorHandler } from '@/utils/errorHandler';
import router from '../router';

export const useSearchStore = defineStore('search', () => {
    const searchResults = ref([]);
    const hasMore = ref(true);
    const isLoading = ref(false);
    const error = ref(null);
    const lastSearchParams = ref(null);
    const userSearchResults = ref([]);
    const hasMoreUsers = ref(true);
    const userSearchParams = ref(null);
    const { handleError } = useErrorHandler();

    const searchPosts = async ({ keyword, index = 0, count = 20 }) => {
        if (!keyword?.trim()) {
            searchResults.value = [];
            return;
        }

        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiService.searchPosts(keyword, index, count);
            const data = response.data;

            if (data.code === '1000') {
                // Filter and sort results client-side for better matching
                const decodedKeyword = decodeURIComponent(keyword.trim()).toLowerCase();
                const filteredResults = data.data.filter(post => {
                    const decodedContent = decodeURIComponent(post.content || '').toLowerCase();
                    const decodedUsername = decodeURIComponent(post.author?.userName || '').toLowerCase();
                    return decodedContent.includes(decodedKeyword) ||
                        decodedUsername.includes(decodedKeyword);
                });

                searchResults.value = filteredResults;
                hasMore.value = data.data.length === count;
            }
        } catch (err) {
            error.value = 'Search failed';
            await handleError(err);
        } finally {
            isLoading.value = false;
        }
    }

    const searchUsers = async ({ keyword, index = 0, count = 20 }) => {
        const trimmedKeyword = keyword?.trim();
        if (!trimmedKeyword) {
            userSearchResults.value = [];
            hasMoreUsers.value = false;
            return { users: [], total: 0 };
        }

        isLoading.value = true;
        error.value = null;
        userSearchParams.value = { keyword: trimmedKeyword, index, count };

        try {
            const response = await apiService.searchUsers(trimmedKeyword, index, count);
            const { code, data, message } = response.data;

            if (code === '1000' && Array.isArray(data)) {
                // Process and normalize user data
                const processedUsers = data.map(user => ({
                    ...user,
                    userName: decodeURIComponent(user.userName || ''),
                    userNameLowerCase: user.userNameLowerCase?.map(part => decodeURIComponent(part)) || [],
                    avatar: user.avatar || '',
                    same_friends: Number(user.same_friends || 0)
                }));

                // Update store state
                if (index === 0) {
                    userSearchResults.value = processedUsers;
                } else {
                    // Remove duplicates when appending
                    const existingIds = new Set(userSearchResults.value.map(u => u.userId));
                    const newUsers = processedUsers.filter(user => !existingIds.has(user.userId));
                    userSearchResults.value = [...userSearchResults.value, ...newUsers];
                }

                hasMoreUsers.value = processedUsers.length === count;
                return { users: processedUsers, total: userSearchResults.value.length };
            } 

            if (code === '9994') {
                if (index === 0) userSearchResults.value = [];
                hasMoreUsers.value = false;
                return { users: [], total: 0 };
            }

            throw new Error(message || 'Failed to search users');
        } catch (err) {
            error.value = err.message || 'Failed to search users';
            await handleError(err);
            return { users: [], total: 0 };
        } finally {
            isLoading.value = false;
        }
    };

    const resetUserSearch = () => {
        userSearchResults.value = [];
        hasMoreUsers.value = true;
        userSearchParams.value = null;
        error.value = null;
    };

    const retryUserSearch = async () => {
        if (userSearchParams.value) {
            await searchUsers(userSearchParams.value);
        }
    };

    const loadMoreUsers = async () => {
        if (!hasMoreUsers.value || !userSearchParams.value) return;

        const nextIndex = userSearchResults.value.length;
        await searchUsers({
            ...userSearchParams.value,
            index: nextIndex
        });
    };

    const resetSearch = () => {
        searchResults.value = []
        hasMore.value = true
        isLoading.value = false
        error.value = null
        lastSearchParams.value = null
    }

    const retryLastSearch = async () => {
        if (lastSearchParams.value) {
            await searchPosts(lastSearchParams.value)
        }
    }

    const getSavedSearches = async (index = 0, count = 20) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await apiService.getSavedSearches({ index, count })
            const data = response.data

            if (data.code === '1000') {
                return data.data.data
            } else if (data.code === '9994') {
                return []
            } else {
                throw new Error(data.message || 'Failed to fetch saved searches')
            }
        } catch (err) {
            error.value = 'Failed to fetch saved searches'
            await handleError(err)
            return []
        } finally {
            isLoading.value = false
        }
    }

    const deleteSavedSearch = async (searchId, all = false) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await apiService.deleteSavedSearch(searchId, all)
            const data = response.data

            if (data.code === '1000') {
                if (all) {
                    searchResults.value = []
                } else {
                    searchResults.value = searchResults.value.filter(search => search.id !== searchId)
                }
            } else {
                throw new Error(data.message || 'Failed to delete saved search')
            }
        } catch (err) {
            error.value = 'Failed to delete saved search'
            await handleError(err)
        } finally {
            isLoading.value = false
        }
    }

    return {
        searchResults,
        hasMore,
        isLoading,
        error,
        searchPosts,
        resetSearch,
        retryLastSearch,
        getSavedSearches,
        deleteSavedSearch,
        userSearchResults,
        hasMoreUsers,
        searchUsers,
        resetUserSearch,
        retryUserSearch,
        loadMoreUsers,
    }
})
