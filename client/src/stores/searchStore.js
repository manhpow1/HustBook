import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '../services/api';
import { handleError } from '../utils/errorHandler';

export const useSearchStore = defineStore('search', () => {
    const searchResults = ref([]);
    const hasMore = ref(true);
    const isLoading = ref(false);
    const error = ref(null);
    const lastSearchParams = ref(null);
    const normalizedSearchResults = computed(() => {
        return searchResults.value.map(result => ({
            ...result,
            keyword: result.keyword.trim(),
        }));
    });
    const sortedSearchResults = computed(() => {
        return [...normalizedSearchResults.value].sort((a, b) => new Date(b.created) - new Date(a.created));
    });

    const searchPosts = async ({ keyword, user_id, filter, index = 0, count = 20 }, router) => {
        console.log('Starting searchPosts with params:', { keyword, user_id, filter, index, count });

        if (!keyword || keyword.trim() === '') {
            console.warn('Keyword is missing. Aborting search.');
            isLoading.value = false;
            return;
        }

        isLoading.value = true;
        error.value = null;
        lastSearchParams.value = { keyword, user_id, filter, index, count };

        try {
            const response = await apiService.search(keyword, user_id, filter, index, count);
            const data = response.data;

            if (data.code === '1000') {
                const validPosts = data.data.filter((post) => {
                    return post.author?.id && (post.described || post.image || post.video);
                });

                let newResults = index === 0 ? validPosts : [...searchResults.value, ...validPosts];

                const uniqueResults = [];
                const seenIds = new Set();

                for (const post of newResults) {
                    if (!seenIds.has(post.id)) {
                        seenIds.add(post.id);
                        uniqueResults.push(post);
                    }
                }

                searchResults.value = uniqueResults;
                hasMore.value = validPosts.length === count;
                console.log('Search results updated:', searchResults.value);
                console.log('Has more results:', hasMore.value);
            } else if (data.code === '9994') {
                if (index === 0) {
                    searchResults.value = [];
                }
                hasMore.value = false;
                console.log('No more results to load (code 9994).');
            } else {
                error.value = data.message || 'An error occurred during search';
                console.error('Error in searchPosts:', error.value);
            }
        } catch (err) {
            await handleError(err, router);
        } finally {
            isLoading.value = false;
            console.log('searchPosts completed. isLoading set to false.');
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
            await handleError(err);
        } finally {
            isLoading.value = false;
        }
    };

    const deleteSavedSearch = async (searchId) => {
        isLoading.value = true;
        error.value = null;
        try {
            await apiService.deleteSavedSearch(searchId);
        } catch (err) {
            await handleError(err);
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