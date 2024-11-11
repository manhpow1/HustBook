import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiService from '../services/api'

export const useSearchStore = defineStore('search', () => {
    const searchResults = ref([])
    const loading = ref(false)
    const error = ref(null)
    const hasMore = ref(true)

    const searchPosts = async ({ keyword, user_id, index = 0, count = 20 }) => {
        loading.value = true;
        error.value = null;
        try {
            const data = await apiService.search(keyword, user_id, index, count);
            if (data.code === '1000') {
                searchResults.value = index === 0 ? data.data : [...searchResults.value, ...data.data];
                hasMore.value = data.data.length === count;
            } else if (data.code === '9994') {
                searchResults.value = index === 0 ? [] : searchResults.value;
                hasMore.value = false;
            } else {
                throw new Error(data.message || 'An error occurred during search');
            }
        } catch (err) {
            error.value = err.message;
        } finally {
            loading.value = false;
        }
    };

    const resetSearch = () => {
        searchResults.value = []
        loading.value = false
        error.value = null
        hasMore.value = true
    }

    return {
        searchResults,
        loading,
        error,
        hasMore,
        searchPosts,
        resetSearch
    }
})