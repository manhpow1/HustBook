// stores/searchStore.js
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
    const savedSearches = ref([]);

    const { handleError } = useErrorHandler();

    const searchPosts = async ({ keyword, index = 0, count = 20, hashtag = null }) => {
        // Don't search if no keyword and no hashtag
        if (!keyword?.trim() && !hashtag?.trim()) {
            error.value = 'Search term cannot be empty.';
            return;
        }

        isLoading.value = true;
        error.value = null;

        // Store last search parameters for potential retry
        lastSearchParams.value = { keyword, index, count, hashtag };

        try {
            // Format search terms - combine keyword and hashtag if both exist
            let searchTerm = keyword?.trim() || '';
            if (hashtag?.trim()) {
                // Remove # if it exists at the start of hashtag
                const cleanHashtag = hashtag.trim().replace(/^#/, '');
                searchTerm = searchTerm ? `${searchTerm} #${cleanHashtag}` : `#${cleanHashtag}`;
            }

            const response = await apiService.search(searchTerm, index, count);
            const data = response.data;

            if (data.code === '1000') {
                // If it's a new search (index === 0), replace results
                // If it's pagination (index > 0), append results
                if (index === 0) {
                    searchResults.value = data.data;
                } else {
                    searchResults.value = [...searchResults.value, ...data.data];
                }

                // Update hasMore based on whether we got a full page of results
                hasMore.value = data.data.length === count;

                // Save search if it's a new search (not pagination)
                if (index === 0 && searchTerm) {
                    await saveSearchTerm(searchTerm);
                }
            } else if (data.code === '9994') {
                if (index === 0) {
                    searchResults.value = [];
                }
                hasMore.value = false;
            } else {
                throw new Error(data.message || 'An error occurred during search');
            }
        } catch (err) {
            error.value = 'Failed to perform search';
            await handleError(err, router);
        } finally {
            isLoading.value = false;
        }
    };

    const resetSearch = () => {
        searchResults.value = [];
        hasMore.value = true;
        isLoading.value = false;
        error.value = null;
        lastSearchParams.value = null;
    };

    const retryLastSearch = async () => {
        if (lastSearchParams.value) {
            await searchPosts(lastSearchParams.value);
        }
    };

    const getSavedSearches = async (index = 0, count = 20) => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiService.getSavedSearches({ index, count });
            const data = response.data;

            if (data.code === '1000') {
                savedSearches.value = data.data.data;
                return data.data.data;
            } else if (data.code === '9994') {
                savedSearches.value = [];
                return [];
            } else {
                throw new Error(data.message || 'Failed to fetch saved searches');
            }
        } catch (err) {
            error.value = 'Failed to fetch saved searches';
            await handleError(err, router);
            return [];
        } finally {
            isLoading.value = false;
        }
    };

    const saveSearchTerm = async (searchTerm) => {
        try {
            // Check if search term starts with # for hashtag searches
            const isHashtag = searchTerm.startsWith('#');
            const searchData = {
                keyword: searchTerm,
                type: isHashtag ? 'hashtag' : 'keyword'
            };

            await apiService.saveSearch(searchData);
        } catch (err) {
            // Silent fail for search saving - don't disrupt main search functionality
            console.error('Failed to save search term:', err);
        }
    };

    const deleteSavedSearch = async (searchId, all = false) => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiService.deleteSavedSearch(searchId, all);
            const data = response.data;

            if (data.code === '1000') {
                if (all) {
                    savedSearches.value = [];
                } else {
                    savedSearches.value = savedSearches.value.filter(search => search.id !== searchId);
                }
            } else {
                throw new Error(data.message || 'Failed to delete saved search');
            }
        } catch (err) {
            error.value = 'Failed to delete saved search';
            await handleError(err, router);
        } finally {
            isLoading.value = false;
        }
    };

    // Get trending hashtags
    const getTrendingHashtags = async (count = 10) => {
        try {
            const response = await apiService.getTrendingHashtags(count);
            const data = response.data;

            if (data.code === '1000') {
                return data.data;
            }
            return [];
        } catch (err) {
            console.error('Failed to fetch trending hashtags:', err);
            return [];
        }
    };

    return {
        searchResults,
        hasMore,
        isLoading,
        error,
        savedSearches,
        searchPosts,
        resetSearch,
        retryLastSearch,
        getSavedSearches,
        deleteSavedSearch,
        getTrendingHashtags
    };
});