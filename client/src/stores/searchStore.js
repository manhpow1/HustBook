import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiService from '../services/api';

export const useSearchStore = defineStore('search', () => {
    const searchResults = ref([]);
    const hasMore = ref(true);
    const isLoading = ref(false);
    const error = ref(null);
    const lastSearchParams = ref(null);

    const searchPosts = async ({ keyword, user_id, filter, index = 0, count = 20 }) => {
        isLoading.value = true;
        error.value = null;
        lastSearchParams.value = { keyword, user_id, filter, index, count };

        try {
            const response = await apiService.search(keyword, user_id, filter, index, count);
            const data = response.data;

            if (data.code === '1000') {
                searchResults.value =
                    index === 0 ? data.data : [...searchResults.value, ...data.data];
                hasMore.value = data.data.length === count;
            } else if (data.code === '9994') {
                if (index === 0) {
                    searchResults.value = [];
                }
                hasMore.value = false;
            } else {
                throw new Error(data.message || 'An error occurred during search');
            }
        } catch (err) {
            error.value = err;
            throw err;
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

    const retryLastSearch = () => {
        if (lastSearchParams.value) {
            searchPosts(lastSearchParams.value);
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