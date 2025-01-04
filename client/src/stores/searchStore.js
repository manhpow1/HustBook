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
                const filteredResults = data.data.filter(post =>
                    partialMatch(post.content, keyword) ||
                    partialMatch(post.author?.userName, keyword)
                );

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
        if (!keyword?.trim()) {
            userSearchResults.value = [];
            return [];
        }

        isLoading.value = true;
        error.value = null;
        userSearchParams.value = { keyword, index, count };

        try {
            const response = await apiService.searchUsers(keyword, index, count);

            const data = response.data;
            if (data.code === '1000') {
                // For initial search, replace results
                if (index === 0) {
                    userSearchResults.value = data.data;
                } else {
                    // For pagination, append results
                    userSearchResults.value = [...userSearchResults.value, ...data.data];
                }

                hasMoreUsers.value = data.data.length === count;
                return data.data;
            } else if (data.code === '9994') {
                if (index === 0) {
                    userSearchResults.value = [];
                }
                hasMoreUsers.value = false;
                return [];
            } else {
                throw new Error(data.message || 'Failed to search users');
            }
        } catch (err) {
            error.value = 'Failed to search users';
            await handleError(err);
            return [];
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