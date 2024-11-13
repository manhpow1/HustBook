import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiService from '../services/api';
import { handleError } from '../utils/errorHandler';

export const useSearchStore = defineStore('search', () => {
    const searchResults = ref([]);
    const hasMore = ref(true);
    const isLoading = ref(false);
    const error = ref(null);
    const lastSearchParams = ref(null);

    const searchPosts = async ({ keyword, user_id, filter, index = 0, count = 20 }, router) => {
        console.log('Starting searchPosts with params:', { keyword, user_id, filter, index, count });

        // Block request if keyword is missing
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
                // Filter posts to include only those with valid author ID and at least one valid field (described or media)
                const validPosts = data.data.filter((post) => {
                    return post.author?.id && (post.described || post.image || post.video);
                });

                // Combine with existing results
                let newResults = index === 0 ? validPosts : [...searchResults.value, ...validPosts];

                // Deduplicate posts based on post ID
                const uniqueResults = [];
                const seenIds = new Set();

                for (const post of newResults) {
                    if (!seenIds.has(post.id)) {
                        seenIds.add(post.id);
                        uniqueResults.push(post);
                    }
                }

                // Limit to 20 results
                searchResults.value = uniqueResults.slice(0, 20);
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
                // Set error message from server response
                error.value = data.message || 'An error occurred during search';
                console.error('Error in searchPosts:', error.value);
            }
        } catch (err) {
            // Use handleError to handle the error
            await handleError(err, router);

            // Set the error message so the component can display it
            error.value = err.response?.data?.message || err.message || 'An error occurred during search';
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

    const retryLastSearch = (router) => {
        console.log('Retrying last search with params:', lastSearchParams.value);
        if (lastSearchParams.value) {
            searchPosts(lastSearchParams.value, router);
        } else {
            console.warn('No last search parameters available for retry.');
        }
    };

    return {
        searchResults,
        hasMore,
        isLoading,
        error,
        searchPosts,
        resetSearch,
        retryLastSearch,
    };
});
