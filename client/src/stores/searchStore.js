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
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiService.searchPosts(keyword, index, count);
            if (response.data?.code === '1000') {
                searchResults.value = response.data.data || [];
                hasMore.value = searchResults.value.length === count;
            } else if (response.data?.code === '9994') {
                searchResults.value = [];
                hasMore.value = false;
            }
        } catch (err) {
            error.value = err.message || 'Search failed';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const searchUsers = async ({ keyword, index = 0, count = 20 }) => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiService.searchUsers(keyword, index, count);
            if (response.data?.code === '1000') {
                const users = response.data.data || [];
                if (index === 0) {
                    userSearchResults.value = users;
                } else {
                    const existingIds = new Set(userSearchResults.value.map(u => u.userId));
                    const newUsers = users.filter(user => !existingIds.has(user.userId));
                    userSearchResults.value = [...userSearchResults.value, ...newUsers];
                }
                return { users, total: userSearchResults.value.length };
            }
            return { users: [], total: 0 };
        } catch (err) {
            error.value = err.message || 'Search failed';
            throw err;
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
