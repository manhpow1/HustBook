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
        console.log('Starting search with params:', { keyword, index, count });

        if (!keyword?.trim()) {
            console.log('No keyword provided, resetting search results');
            searchResults.value = [];
            return;
        }

        isLoading.value = true;
        error.value = null;

        try {
            // Normalize keyword
            const normalizedKeyword = decodeURIComponent(keyword.trim()).toLowerCase();
            console.log('Normalized keyword:', normalizedKeyword);

            // First try with original keyword
            let response = await apiService.searchPosts(normalizedKeyword, index, count);
            console.log('Raw API response:', response);

            let data = response.data;
            console.log('Response data:', data);

            if (data.code === '1000') {
                // If no results and keyword contains multiple words, try with individual words
                if (data.data.length === 0 && normalizedKeyword.includes(' ')) {
                    console.log('No results with full phrase, trying individual words');
                    const words = normalizedKeyword.split(/\s+/).filter(word => word.length > 0);

                    // Try with first word
                    response = await apiService.searchPosts(words[0], index, count);
                    data = response.data;
                    console.log('Retry response with first word:', data);
                }

                if (!data.data || !Array.isArray(data.data)) {
                    console.warn('Invalid data format from API');
                    searchResults.value = [];
                    return;
                }

                // Server now provides properly formatted results
                const processedResults = data.data.map(post => ({
                    ...post,
                    content: decodeURIComponent(post.content || ''),
                    author: {
                        ...post.author,
                        userName: decodeURIComponent(post.author?.userName || '')
                    }
                }));

                console.log('Processed results:', processedResults);
                searchResults.value = processedResults;
                hasMore.value = processedResults.length === count;

                // Sort results: exact matches first, then by date
                const sortedResults = filteredResults.sort((a, b) => {
                    if (a.isExactMatch !== b.isExactMatch) {
                        return a.isExactMatch ? -1 : 1;
                    }
                    return new Date(b.created) - new Date(a.created);
                });

                console.log('Processed search results:', sortedResults);
                searchResults.value = sortedResults;
                hasMore.value = data.data.length === count;

                // Cache last search params for retry
                lastSearchParams.value = { keyword, index, count };
            } else {
                console.warn('API returned non-success code:', data.code);
                error.value = data.message || 'Search failed';
            }
        } catch (err) {
            console.error('Search failed:', err);
            error.value = 'Search failed';
            await handleError(err);
        } finally {
            isLoading.value = false;
            console.log('Search completed, loading state reset');
        }
    }

    const searchUsers = async ({ keyword, index = 0, count = 20 }) => {
        console.log('Starting user search with params:', { keyword, index, count });

        const trimmedKeyword = keyword?.trim();
        if (!trimmedKeyword) {
            console.log('No keyword provided, resetting user search results');
            userSearchResults.value = [];
            hasMoreUsers.value = false;
            return { users: [], total: 0 };
        }

        isLoading.value = true;
        error.value = null;
        userSearchParams.value = { keyword: trimmedKeyword, index, count };

        try {
            console.log('Sending API request for search users');
            const response = await apiService.searchUsers(trimmedKeyword, index, count);
            console.log('Raw API response for user search:', response);

            const { code, data, message } = response.data;

            if (code === '1000' && Array.isArray(data)) {
                console.log('Processing user search results');
                // Process and normalize user data
                const processedUsers = data.map(user => {
                    const processed = {
                        ...user,
                        userName: decodeURIComponent(user.userName || ''),
                        userNameLowerCase: user.userNameLowerCase?.map(part => decodeURIComponent(part)) || [],
                        avatar: user.avatar || '',
                        same_friends: Number(user.same_friends || 0)
                    };
                    console.log('Processed user:', processed);
                    return processed;
                });

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
                console.log('User search results updated:', {
                    totalUsers: userSearchResults.value.length,
                    hasMore: hasMoreUsers.value
                });
                return { users: processedUsers, total: userSearchResults.value.length };
            }

            if (code === '9994') {
                console.log('No users found');
                if (index === 0) userSearchResults.value = [];
                hasMoreUsers.value = false;
                return { users: [], total: 0 };
            }

            throw new Error(message || 'Failed to search users');
        } catch (err) {
            console.error('User search failed:', err);
            error.value = err.message || 'Failed to search users';
            await handleError(err);
            return { users: [], total: 0 };
        } finally {
            isLoading.value = false;
            console.log('User search completed, loading state reset');
        }
    };

    const resetUserSearch = () => {
        console.log('Resetting user search state');
        userSearchResults.value = [];
        hasMoreUsers.value = true;
        userSearchParams.value = null;
        error.value = null;
    };

    const retryUserSearch = async () => {
        if (userSearchParams.value) {
            console.log('Retrying user search with params:', userSearchParams.value);
            await searchUsers(userSearchParams.value);
        } else {
            console.log('No previous search params found for retry');
        }
    };

    const loadMoreUsers = async () => {
        if (!hasMoreUsers.value || !userSearchParams.value) {
            console.log('Cannot load more users:', {
                hasMore: hasMoreUsers.value,
                hasParams: !!userSearchParams.value
            });
            return;
        }

        const nextIndex = userSearchResults.value.length;
        console.log('Loading more users from index:', nextIndex);
        await searchUsers({
            ...userSearchParams.value,
            index: nextIndex
        });
    };

    const resetSearch = () => {
        console.log('Resetting search state');
        searchResults.value = [];
        hasMore.value = true;
        isLoading.value = false;
        error.value = null;
        lastSearchParams.value = null;
    }

    const retryLastSearch = async () => {
        if (lastSearchParams.value) {
            console.log('Retrying last search with params:', lastSearchParams.value);
            await searchPosts(lastSearchParams.value);
        } else {
            console.log('No previous search params found for retry');
        }
    }

    const getSavedSearches = async (index = 0, count = 20) => {
        console.log('Fetching saved searches:', { index, count });
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiService.getSavedSearches({ index, count });
            console.log('Saved searches response:', response);
            const data = response.data;

            if (data.code === '1000') {
                console.log('Successfully fetched saved searches:', data.data.data);
                return data.data.data;
            } else if (data.code === '9994') {
                console.log('No saved searches found');
                return [];
            } else {
                throw new Error(data.message || 'Failed to fetch saved searches');
            }
        } catch (err) {
            console.error('Failed to fetch saved searches:', err);
            error.value = 'Failed to fetch saved searches';
            await handleError(err);
            return [];
        } finally {
            isLoading.value = false;
        }
    }

    const deleteSavedSearch = async (searchId, all = false) => {
        console.log('Deleting saved search:', { searchId, all });
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiService.deleteSavedSearch(searchId, all);
            console.log('Delete saved search response:', response);
            const data = response.data;

            if (data.code === '1000') {
                if (all) {
                    console.log('Deleted all saved searches');
                    searchResults.value = [];
                } else {
                    console.log('Deleted saved search:', searchId);
                    searchResults.value = searchResults.value.filter(search => search.id !== searchId);
                }
            } else {
                throw new Error(data.message || 'Failed to delete saved search');
            }
        } catch (err) {
            console.error('Failed to delete saved search:', err);
            error.value = 'Failed to delete saved search';
            await handleError(err);
        } finally {
            isLoading.value = false;
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
