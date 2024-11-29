import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiService from '../services/api';
import { handleError } from '../utils/errorHandler';
import router from '../router';

export const useSearchStore = defineStore('search', () => {
    const searchResults = ref([]);
    const hasMore = ref(true);
    const isLoading = ref(false);
    const error = ref(null);
    const lastSearchParams = ref(null);

    const searchPosts = async ({ keyword, index = 0, count = 20 }) => {
        if (!keyword || keyword.trim() === '') {
            error.value = 'Keyword cannot be empty.';
            return;
        }

        isLoading.value = true;
        error.value = null;
        lastSearchParams.value = { keyword, index, count };

        try {
            const response = await apiService.search(keyword, index, count)
            const data = response.data

            if (data.code === '1000') {
                searchResults.value = [...searchResults.value, ...data.data]
                hasMore.value = data.data.length === count
            } else if (data.code === '9994') {
                if (index === 0) searchResults.value = []
                hasMore.value = false
            } else {
                throw new Error(data.message || 'An error occurred during search')
            }
        } catch (err) {
            error.value = 'Failed to perform search'
            await handleError(err, router)
        } finally {
            isLoading.value = false
        }
    }

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
            await handleError(err, router)
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
            await handleError(err, router)
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
    }
})