import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '../services/api';
import { handleError } from '../utils/errorHandler';
import router from '../router';

export const useSearchStore = defineStore('search', () => {
    const searchResults = ref([]);
    const hasMore = ref(true);
    const isLoading = ref(false);
    const error = ref(null);
    const lastSearchParams = ref(null);
    const normalizedSearchResults = computed(() => {
        return searchResults.value.map(result => ({
            ...result,
            keyword: result.keyword ? result.keyword.trim() : '',
        }));
    });
    const sortedSearchResults = computed(() => {
        return [...normalizedSearchResults.value].sort((a, b) => new Date(b.created) - new Date(a.created));
    });

    const searchPosts = async ({ user_id, keyword, index = 0, count = 20 }, router) => {
        console.log('Starting searchPosts with params:', { user_id, keyword, index, count });

        if (!keyword || keyword.trim() === '') {
            console.warn('Keyword is missing. Aborting search.');
            error.value = 'Keyword cannot be empty.';
            isLoading.value = false; // Ensure loading state is reset
            return; // Prevent further execution
        }

        if (isNaN(index) || isNaN(count)) {
            console.warn('Invalid index or count. Aborting search.');
            isLoading.value = false;
            error.value = 'Parameter value is invalid.';
            return;
        }

        isLoading.value = true;
        error.value = null;
        lastSearchParams.value = { user_id, keyword, index, count };

        try {
            const response = await apiService.search(user_id, keyword, index, count);
            const data = response.data;

            if (data.code === '1000') {
                const validPosts = data.data.filter((post) =>
                    post.author?.id && (post.described || post.image || post.video)
                );
                searchResults.value = [...new Set([...searchResults.value, ...validPosts])];
                hasMore.value = validPosts.length === count;
            } else if (data.code === '9994') {
                if (index === 0) searchResults.value = [];
                hasMore.value = false;
            } else {
                throw new Error(data.message || 'An error occurred during search');
            }
        } catch (err) {
            await handleError(err, router);
        } finally {
            isLoading.value = false;
        }
    };

    const resetSearch = () => {
        console.log('Resetting search state.');
        searchResults.value = [];
        hasMore.value = true;
        isLoading.value = false;
        error.value = null;
        lastSearchParams.value = null;
        console.log('Search state after reset:', { searchResults: searchResults.value, hasMore: hasMore.value });
    };

    const retryLastSearch = async (router) => {
        console.log('Retrying last search with params:', lastSearchParams.value);
        if (lastSearchParams.value) {
            await searchPosts(lastSearchParams.value, router);
        } else {
            console.warn('No last search parameters available for retry.');
        }
    };

    const getSavedSearches = async (index = 0, count = 20) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiService.getSavedSearches({ index, count });
            return {
                ...response,
                data: response.data.filter(search => search.id && search.keyword && search.created)
            };
        } catch (err) {
            await handleError(err, router);
            return { data: [] };
        } finally {
            isLoading.value = false;
        }
    };

    const deleteSavedSearch = async (searchId, all = false) => {
        isLoading.value = true;
        error.value = null;
        try {
            await apiService.deleteSavedSearch(searchId, all);
            if (all) {
                searchResults.value = [];
            } else {
                searchResults.value = searchResults.value.filter(search => search.id !== searchId);
            }
        } catch (err) {
            await handleError(err, router);
        } finally {
            isLoading.value = false;
        }
    };

    return {
        searchResults: sortedSearchResults,
        hasMore,
        isLoading,
        error,
        searchPosts,
        resetSearch,
        retryLastSearch,
        getSavedSearches,
        deleteSavedSearch,
    };
});