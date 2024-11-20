<template>
    <div v-if="isLoggedIn" class="max-w-4xl mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">{{ t('searchTitle') }}</h1>

        <div class="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0 mb-4">
            <div class="flex-grow">
                <label for="keyword" class="sr-only">{{ t('keywordLabel') }}</label>
                <Input id="keyword" v-model="keyword" name="keyword" :placeholder="t('searchKeywordPlaceholder')"
                    @input="debouncedSearch">
                <template #icon>
                    <SearchIcon class="w-5 h-5 text-gray-400" />
                </template>
                </Input>
            </div>

            <div>
                <label for="userId" class="sr-only">{{ t('userIdLabel') }}</label>
                <Input id="userId" v-model="userId" :placeholder="t('userIdPlaceholder')" @input="debouncedSearch">
                <template #icon>
                    <UserIcon class="w-5 h-5 text-gray-400" />
                </template>
                </Input>
            </div>

            <Button @click="handleSearch" :disabled="isLoading" :aria-disabled="isLoading">
                <template v-if="isLoading">
                    <Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
                    {{ t('searching') }}
                </template>
                <template v-else>
                    {{ t('search') }}
                </template>
            </Button>
        </div>

        <!-- Saved Searches Section -->
        <div v-if="normalizedSavedSearches.length > 0" class="mt-4 mb-6">
            <h2 class="text-lg font-semibold mb-2">{{ t('savedSearches') }}</h2>
            <ul class="space-y-2">
                <li v-for="search in normalizedSavedSearches" :key="search.id"
                    class="flex items-center justify-between bg-gray-100 p-2 rounded saved-search" :data-id="search.id">
                    <span>{{ search.keyword }}</span>
                    <div>
                        <Button @click="applySavedSearch(search)" variant="outline" size="small" class="mr-2">
                            {{ t('apply') }}
                        </Button>
                        <Button @click="deleteSavedSearch(search.id)" variant="outline" size="small"
                            class="text-red-500" data-testid="delete-button">
                            {{ t('delete') }}
                        </Button>
                    </div>
                </li>
            </ul>
            <Button @click="deleteAllSavedSearches" variant="outline" size="small" class="mt-2 text-red-500"
                data-testid="delete-all-button">
                {{ t('deleteAll') }}
            </Button>
        </div>

        <!-- Search Results Section -->
        <div v-if="isLoading && !searchResults.length" class="space-y-4">
            <PostSkeleton v-for="i in 3" :key="i" />
        </div>

        <div v-else-if="error" class="text-red-500 mb-4">
            {{ error }}
            <Button @click="retrySearch" variant="outline" class="mt-2">
                {{ t('retrySearch') }}
            </Button>
        </div>

        <div v-else-if="searchResults.length > 0" class="space-y-4">
            <TransitionGroup name="list" tag="div">
                <Card v-for="post in sortedSearchResults" :key="post.id" :post="post" :ref="'post-' + post.id"
                    :data-test="'card-' + post.id" class="overflow-hidden search-result"
                    @coverError="handleCoverError(post)">
                    <div class="p-4">
                        <h2 class="text-xl font-semibold mb-2">{{ post.author.username }}</h2>
                        <p class="text-gray-600 mb-2">{{ post.described }}</p>
                        <div class="flex items-center text-sm text-gray-500">
                            <CalendarIcon class="w-4 h-4 mr-1" />
                            <span>{{ formatDate(post.created) }}</span>
                        </div>
                        <div class="mt-2">
                            <Button @click="viewPost(post.id)">{{ t('viewPost') }}</Button>
                        </div>
                    </div>
                </Card>
            </TransitionGroup>
        </div>

        <p v-else class="text-gray-500">{{ t('noResultsFound') }}</p>

        <div v-if="hasMore" class="mt-4">
            <Button @click="loadMore" variant="outline" :disabled="isLoading" :aria-disabled="isLoading">
                <template v-if="isLoading">
                    <Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
                    {{ t('loading') }}
                </template>
                <template v-else>
                    {{ t('loadMore') }}
                </template>
            </Button>
        </div>
    </div>
    <p v-else class="text-gray-500">{{ t('pleaseLogin') }}</p>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSearchStore } from '../../stores/searchStore';
import { useUserStore } from '../../stores/userStore';
import { useRouter } from 'vue-router';
import { Button, Input, Card } from '../ui';
import { SearchIcon, UserIcon, CalendarIcon, Loader2Icon } from 'lucide-vue-next';
import { formatDate } from '../../utils/helpers';
import { useSearch } from '../../composables/useSearch';
import { usePagination } from '../../composables/usePagination';
import PostSkeleton from '../shared/PostSkeleton.vue';

const { t } = useI18n();

const searchStore = useSearchStore();
const userStore = useUserStore();
const router = useRouter();

const { keyword, userId, debouncedSearch } = useSearch();
const { index, count } = usePagination();

const isLoggedIn = computed(() => userStore.isLoggedIn);
const searchResults = computed(() => searchStore.searchResults);
const hasMore = computed(() => searchStore.hasMore);
const isLoading = computed(() => searchStore.isLoading);
const error = computed(() => searchStore.error);
const savedSearches = ref([]);

const normalizedSavedSearches = computed(() => {
    const uniqueSearches = new Map();
    savedSearches.value.forEach(search => {
        if (search.id && search.keyword && search.created) {
            const normalizedKeyword = search.keyword.trim();
            if (!uniqueSearches.has(normalizedKeyword) || search.created > uniqueSearches.get(normalizedKeyword).created) {
                uniqueSearches.set(normalizedKeyword, search);
            }
        }
    });
    return Array.from(uniqueSearches.values())
        .sort((a, b) => b.created - a.created)
        .slice(0, 20);
});

const sortedSearchResults = computed(() => {
    return [...searchResults.value].sort((a, b) => new Date(b.created) - new Date(a.created));
});

const handleSearch = async () => {
    console.log("Starting search with:", { keyword: keyword.value, userId: userId.value });

    if (!keyword.value.trim() || !userId.value.trim()) {
        console.warn('Keyword or userId is missing. Aborting search.');
        searchStore.error = 'Keyword or UserID cannot be empty.';
        return;
    }

    searchStore.error = null;

    try {
        await searchStore.searchPosts({
            keyword: keyword.value,
            user_id: userId.value,
            index: index.value,
            count: count.value,
        }, router);
    } catch (error) {
        console.error("Error during search:", error.message);
    }
};

const handleCoverError = (post) => {
    searchStore.searchResults = searchStore.searchResults.filter((p) => p.id !== post.id);
};

const loadMore = async () => {
    console.log("Loading more results with:", {
        keyword: keyword.value,
        userId: userId.value,
        nextIndex: index.value + count.value,
        count: count.value,
    });
    await searchStore.searchPosts({
        keyword: keyword.value,
        user_id: userId.value,
        index: index.value + count.value,
        count: count.value,
    }, router);
    index.value += count.value;
    console.log("Loaded more results, new index:", index.value);
};

const viewPost = (postId) => {
    console.log("Navigating to post:", postId);
    router.push(`/posts/${postId}`);
};

const retrySearch = () => {
    console.log("Retrying search");
    searchStore.error = null;
    searchStore.retryLastSearch(router);
};

const fetchSavedSearches = async () => {
    try {
        const response = await searchStore.getSavedSearches(0, 100); // Fetch more to handle duplicates
        savedSearches.value = response.data;
    } catch (error) {
        console.error('Error fetching saved searches:', error);
    }
};

const applySavedSearch = (search) => {
    keyword.value = search.keyword;
    handleSearch();
};

const deleteSavedSearch = async (searchId) => {
    console.log(`Attempting to delete saved search with ID: ${searchId}`);
    try {
        await searchStore.deleteSavedSearch(searchId);
        console.log(`Successfully deleted saved search with ID: ${searchId}`);
        await fetchSavedSearches();
        console.log('Fetched updated list of saved searches after deletion.');
    } catch (error) {
        console.error(`Error deleting saved search with ID ${searchId}:`, error);
    }
};

const deleteAllSavedSearches = async () => {
    console.log('Attempting to delete all saved searches.');
    try {
        await searchStore.deleteSavedSearch(null, true);
        console.log('Successfully deleted all saved searches.');
        await fetchSavedSearches();
        console.log('Fetched updated list of saved searches after deleting all.');
    } catch (error) {
        console.error('Error deleting all saved searches:', error);
    }
};

watch([keyword, userId], ([newKeyword, newUserId], [oldKeyword, oldUserId]) => {
    if (newKeyword !== oldKeyword || newUserId !== oldUserId) {
        console.log("Keyword or userId changed, resetting index and search results.");
        index.value = 0;
        searchStore.resetSearch();
    }
}, { deep: true, immediate: false });

watch(isLoggedIn, async (newVal) => {
    if (!newVal) {
        console.log('User is not logged in, redirecting to login page');
        await router.push('/login');
    } else {
        fetchSavedSearches();
    }
});

onMounted(async () => {
    if (!isLoggedIn.value) {
        console.log("User is not logged in, redirecting to login page");
        await router.push('/login');
    } else {
        handleSearch();
        fetchSavedSearches();
    }
});
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
    transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

.max-w-4xl {
    max-width: 64rem;
}
</style>